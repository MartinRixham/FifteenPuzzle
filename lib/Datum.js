function Registry() {

	// These variables and the following four methods 
	// mediate the process of dependency tracking.
	// When a binding callback is supplied to a binding
	// the binding firstly requests registrations
	// then executes the callback.
	// Any datum evaluated during the callback execution
	// will check that updater assigners are being registered 
	// and if so will register an updater assigner in the registry.
	// After the callback has been executed the binding will
	// instruct the registry to assign the updater 
	// which it supplies to the registry.
	// The updater assigners will then be called to assign
	// updater to any datum which supplied an assigner.
	// If in the future the value of a datum which has been
	// assigned the updater changes the datum will call the
	// updater which will update the elements which are bound
	// to the binding.
	var registry = [];

	var registering = false;

	this.registerUpdaterAssigner = function(assigner) {

		registry.push(assigner);
	};

	this.requestRegistrations = function() {

		registry = [];

		registering = true;
	};

	this.registeringAssigners = function() {

		return registering;
	};

	this.assignUpdater = function(updater, binding, element) {

		for (var i = 0; i < registry.length; i++) {

			registry[i](updater, binding, element);
		}

		registering = false;
	};

	// These variables and the following two methods organise
	// the application of new bindings.
	// After the binding root has performed the initial binding
	// it supplies a rebinding callback to the registry.
	// When a new binding is instantiated it requests a rebinding.
	// The rebinding is initialised either by the next datum
	// to be called or eventually by a callback supplied to
	// setTimeout.
	var rebind = null;

	var rebindRequested = false;

	this.rebindDataStructure = function(callback) {

		if (callback && !rebind) {

			rebind = callback;
		}
		else if (rebind && rebindRequested) {

			rebindRequested = false;

			rebind();
		}
	};

	this.requestRebind = function() {

		if (rebind) {

			rebindRequested = true;
		}
	};
}

function Subscriber() {

	this.isInScope = function(element, scope) {

		element = element.parentElement;

		if (!element) {

			return true;
		}
		else if (element._rebind) {

			return element == scope;
		}
		else {

			return this.isInScope(element, scope);
		}	
	};
}

Subscriber.prototype = new Registry();

function UniqueRoot() {

	var flag = false;

	this.assertUniqueness = function() {

		if (flag) {

			throw { 
				
				message: "The binding root is unique and " + 
						"cannot be instantiated multiple times.",

				name: "DatumException"
			};
		}
		else {

			flag = true;
		}
	};
}

UniqueRoot.prototype = new Subscriber();

function Binding(bindings) {

	this.requestRebind();

	setTimeout(this.rebindDataStructure);
	
	// The applyBinding method is the sole member of the binding interface,
	// the most important internal interface in Datum.
	// Is is implemented by many different objects and is the library's
	// main point of extensibility.
	// The key principle of the interface is that responsibility is left to
	// the implementation to determine whether it is appropriate for
	// the binding to be applied when the method is called.
	// The binding itself makes sure that it is applied correctly,
	// for example that it is not inappropriately applied multiple times.
	// The client code is responsible only for telling the binding where to bind
	// and signalling that the binding may need to be applied.
	this.applyBinding = function(scope, name, model) {

		if (bindings.text) {

			var text = new Text(bindings.text);

			text.applyBinding(scope, name, model);
		}
		
		if (bindings.value) {

			var value = new Value(bindings.value);

			value.applyBinding(scope, name, model);
		}
		
		if (bindings.click) {

			var click = new Click(bindings.click);

			click.applyBinding(scope, name, model);
		}

		if (bindings.init) {

			var init = new Init(bindings.init);

			init.applyBinding(scope, name, model);
		}

		if (bindings.update) {

			var update = new Update(bindings.update);

			update.applyBinding(scope, name, model);
		}

		if (bindings.visible) {

			var visible = new Visible(bindings.visible);

			visible.applyBinding(scope, name, model);
		}
	};
}

Binding.prototype = new Subscriber();

function BindingRoot(model) {

	this.assertUniqueness();

	var injectProperty = function(key, model, property) {

		var datum = new Datum(property);

		Object.defineProperty(model, key, {

			get: function() { return datum(); },
			set: function(value) { datum(value); }
		});
	};

	var self = this;

	// This method binds an object to a DOM element.
	// It is called recursively to bind the entire data structure.
	BindingRoot.bindObject = function(scope, model) {

		var newBinding = !model._scope;

		model._scope = scope;

		if (model instanceof Array) {

			var foreach = new BindingRoot.ForEach(scope, model);

			return;
		}

		if (!model.toJSON) {

			new BindingRoot.ViewModel(model);
		}

		scope._rebind = function() {
	
			BindingRoot.bindObject(scope, model);
		};

		for(var key in model) {

			if (key == "_scope") {

				continue;
			}

			var property = model[key];
	
			var element = 
				scope.querySelector("[data-bind=" + key + "]");

			if (property && property.applyBinding) {
	
				property.applyBinding(model._scope, key, model);
			}
			else if (typeof(property) != "function") {

				if (newBinding) {

					injectProperty(key, model, property);
				}

				if (element && typeof(property) == "object") {

					new BindingRoot.With(model, key, element);

					if (property) {

						BindingRoot.bindObject(element, property);
					}
				}
			}
		}
	};

	var scope = document.querySelector("body");

	BindingRoot.bindObject(scope, model);

	this.rebindDataStructure(function() {

		BindingRoot.bindObject(scope, model);
	});

	var domWatcher = new BindingRoot.DomWatcher(scope);

	this.disconnect = function() {

		domWatcher.disconnect();
	};
}

BindingRoot.prototype = new UniqueRoot();

function Click(click) {

	this.addListener = function(element, model) {

		element.addEventListener("click", function(event) {

			click.call(model, element);
		});
	};

	this.applyBinding = function(scope, name, model) {

		var elements = scope.querySelectorAll("[data-bind=" + name + "]");

		for (var i = 0; i < elements.length; i++) {

			var element = elements[i];

			if (!element.callbacks) {

				element.callbacks = [];
			}

			var alreadyBound = element.callbacks.indexOf(click) + 1;

			if (!alreadyBound && this.isInScope(element, scope)) {

				this.addListener(element, model);

				element.callbacks.push(click);
			}
		}
	};
}

Click.prototype = new Subscriber();

function Datum(datum) {

	var updateCallbacks = [];

	var dependants = [];

	var self = this;

	var provider = function(value) {

		if (typeof value != "undefined") {

			self.rebindDataStructure();

			datum = value;

			for (var i = 0; i < updateCallbacks.length; i++) {

				var callback = updateCallbacks[i];

				if (!document.contains(callback.element)) {

					updateCallbacks.splice(i, 1);
				}
			}

			for (var j = 0; j < updateCallbacks.length; j++) {

				updateCallbacks[j](value);
			}
		}
		else if (self.registeringAssigners()) {

			self.registerUpdaterAssigner(function(callback, binding, element) {

				if (!dependants.indexOf(binding) + 1) {

					callback.element = element;

					updateCallbacks.push(callback);

					if (binding) {

						dependants.push(binding);
					}
				}
			});
		}
			
		return datum;
	};

	return provider;
}

Datum.prototype = new Subscriber();

BindingRoot.DomWatcher = function(scope) {

	var observer = new MutationObserver(function(mutations) {

		var mutation = mutations[0];

		var notTextMutation = mutation.target.children.length; 

		if (notTextMutation) {

			var element = mutation.target;

			while (element) {

				if (element._rebind) {

					element._rebind();
					break;
				}
				else {

					element = element.parentElement;
				}
			}
		}
	});

	observer.observe(scope, { childList: true, subtree: true });

	this.disconnect = function() {

		observer.disconnect();
	};
};

// The "foreach" binding is applied when an array is bound to an element.
// It copies the contents of the element to which it is bound once
// for each element of the array.
BindingRoot.ForEach = function(scope, model) {

	var currentScope = null;

	this.number = function(element, index) {

		if (element.id) {

			element.id = element.id + "_" + index;
		}

		if (element.hasAttribute && element.hasAttribute("name")) {

			element.setAttribute("name", element.getAttribute("name") + "_" + index);
		}

		if (element.children) {

			for (var i = 0; i < element.children.length; i++) {

				var subelement = element.children[i];

				this.number(subelement, index);
			}
		}
	};

	var self = this;

	this.bind = function(scope) {

		if (scope == currentScope) {

			for (var k = 0; k < model.length; k++) {

				BindingRoot.bindObject(scope.children[k], model[k]);
			}

			return;
		}

		scope._rebind = function() {};

		currentScope = scope;

		var children = [];

		for (var i = scope.childNodes.length - 1; i >= 0; i--) {

			children[i] = scope.childNodes[i];

			scope.removeChild(scope.childNodes[i]);
		}

		var index = 0;

		var newElement = function() {

			var element = document.createElement(scope.nodeName);

			for (var j = 0; j < children.length; j++) {

				var child = children[j];

				var clone = child.cloneNode(true);

				self.number(clone, index);

				element.appendChild(clone);
			}

			index += 1;

			return element;
		};

		var append = function(array) {

			for (var i = 0; i < array.length; i++) {

				var property = array[i];

				var element = newElement();

				scope.appendChild(element);

				if (typeof(property) == "object") {

					BindingRoot.bindObject(element, property);
				}
			}
		};

		var prepend = function(array) {

			for (var i = 0; i < array.length; i++) {

				var property = array[i];

				var element = newElement();

				scope.insertBefore(element, scope.firstChild);

				if (typeof(property) == "object") {

					BindingRoot.bindObject(element, property);
				}
			}
		};

		append(model);

		var originalPush = model.push;

		model.push = function() {

			originalPush.apply(model, arguments);

			append(arguments);
		};

		var originalPop = model.pop;

		model.pop = function() {

			originalPop.apply(model, arguments);

			scope.removeChild(scope.lastElementChild);
		};

		var originalShift = model.shift;

		model.shift = function() {

			originalShift.apply(model, arguments);

			scope.removeChild(scope.firstElementChild);
		};

		var originalUnshift = model.unshift;

		model.unshift = function() {

			originalUnshift.apply(model, arguments);

			prepend(arguments);
		};
	};

	model.applyBinding = function(scope, name, model) {

		scope = scope.querySelector("[data-bind=" + name + "]"); 

		new BindingRoot.With(model, name, scope);

		self.bind(scope);
	};

	this.bind(scope);

	return model;
};

function Init(init) {

	this.applyBinding = function(scope, name, model) {

		var elements = scope.querySelectorAll("[data-bind=" + name + "]");

		for (var i = 0; i < elements.length; i++) {

			var element = elements[i];

			if (!element.callbacks) {

				element.callbacks = [];
			}

			var alreadyBound = element.callbacks.indexOf(init) + 1;

			if (!alreadyBound && this.isInScope(element, scope)) {

				init.call(model, element);

				element.callbacks.push(init);
			}
		}
	};
}

Init.prototype = new Subscriber();

function Text(text) {

	this.createCallback = function(model, element) {

		this.assignUpdater(function() {

			element.textContent = text.call(model, element);
		},
		this,
		element);
	};

	this.applyBinding = function(scope, name, model) {

		var elements = scope.querySelectorAll("[data-bind=" + name + "]");
		
		for (var i = 0; i < elements.length; i++) {

			var element = elements[i];

			if (this.isInScope(element, scope)) {

				this.requestRegistrations();

				element.textContent = text.call(model, element);

				this.createCallback(model, element);
			}
		}
	};
}

Text.prototype = new Subscriber();

// Unlike the other bindings the "update" binding prioritises 
// predictability rather than comprehensiveness when collecting
// dependencies. Dependencies are registered only once when the
// callback is executed during the initial binding.
// After this the callback is called exactly once per change 
// each time the value of a dependency changes.
// This means that expensive operations or AJAX calls etc.
// can be safely placed inside update callbacks
// without them being executed unpredictably.
// However any datum that is not accessed during the initial execution
// will not be registered as a dependency even though the callback may
// indeed depend on the datum.
// Other bindings make further attempts to register dependencies
// and as a result make no guarantee as to when they may execute
// their callbacks.
function Update(update) {

	this.applyBinding = function(scope, name, model) {

		var elements = scope.querySelectorAll("[data-bind=" + name + "]");

		var self = this;

		var applyCallback = function(element) {

			self.assignUpdater(function() {

				update.call(model, element);
			},
			this,
			element);
		};

		for (var i = 0; i < elements.length; i++) {

			var element = elements[i];

			if (!element.callbacks) {

				element.callbacks = [];
			}

			var alreadyBound = element.callbacks.indexOf(update) + 1;

			if (!alreadyBound && this.isInScope(element, scope)) {
	
				this.requestRegistrations();
		
				update.call(model, element);

				applyCallback(element);

				element.callbacks.push(update);
			}
		}
	};
}

Update.prototype = new Subscriber();

function Value(value) {

	this.addCallbacks = function(element, model) {

		if (!element.callbacks) {

			element.callbacks = [];
		}

		var alreadyBound = element.callbacks.indexOf(value) + 1;

		if (!alreadyBound) {

			element.addEventListener("change", function(event) {
					
				value.call(model, event.target.value, element);
			});

			element.callbacks.push(value);
		}

		this.assignUpdater(function() {

			element.value = value.call(model, undefined, element);
		},
		this,
		element);
	};

	this.applyBinding = function(scope, name, model) {

		var elements = scope.querySelectorAll("[data-bind=" + name + "]");

		for (var i = 0; i < elements.length; i++) {

			var element = elements[i];

			if (this.isInScope(element, scope)) {

				this.requestRegistrations();

				var evaluated = value.call(model, undefined, element);

				if (typeof(evaluated) != "undefined") {

					element.value = evaluated;
				}

				this.addCallbacks(element, model);
			}
		}
	};
}

Value.prototype = new Subscriber();

// This is just a collection of utility methods that are helpful
// when building applications with Datum.
BindingRoot.ViewModel = function(model) {

	if (!model) {

		model = {};
	}

	this.toJSON = function(model) {

		var transferObject = {};

		if (model instanceof Array) {

			transferObject = [];
		}

		for (var key in model) {

			var property = model[key];

			if (key == "_scope") {

				continue;
			}

			if (property && 
				typeof(property) == "object" && 
				(!property.applyBinding || property instanceof Array)) {

				transferObject[key] = this.toJSON(property);
			}

			if (!property || 
				(typeof(property) != "object" && 
				typeof(property) != "function")) {

				transferObject[key] = property;
			}
		}

		return transferObject;
	};

	var self = this;

	model.toJSON = function() {

		return JSON.stringify(self.toJSON(model));
	};

	return model;	
};

function Visible(visible) {

	this.applyBinding = function(scope, name, model) {

		var self = this;

		this.applyCallback = function(element, display) {

			self.assignUpdater(function() {

				if(visible.call(model, element)) {

					element.style.display = display;
				}
				else {

					element.style.display = "none";
				}
			},
			this,
			element);
		};

		var elements = scope.querySelectorAll("[data-bind=" + name + "]");

		for (var i = 0; i < elements.length; i++) {

			var element = elements[i];

			if (this.isInScope(element, scope)) {

				var display = getComputedStyle(element).getPropertyValue("display");

				this.requestRegistrations();
		
				if(!visible.call(model, element)) {

					element.style.display = "none";	
				}

				this.applyCallback(element, display);
			}
		}
	};
}

Visible.prototype = new Subscriber();

// The "with" binding is the binding that is applied automatically
// and by convention whenever a plain object is bound to an element.
// Its effect is to remove all child elements from the DOM
// when the object is null.
BindingRoot.With = function(model, key, element) {

	if (!element.boundObjects) {

		element.boundObjects = [];
	}

	var alreadyBound = element.boundObjects.indexOf(model) + 1;

	if (alreadyBound) {

		return;
	}

	element.boundObjects.push(model);

	var children = [];

	for (var i = 0; i < element.childNodes.length; i++) {

		children[i] = element.childNodes[i];
	}

	this.requestRegistrations();

	var object = model[key];

	if (!object) {

		children.forEach(function(child) {

			element.removeChild(child);
		});
	}

	this.assignUpdater(function() {

		var object = model[key];

		for (var i = element.childNodes.length - 1; i >= 0; i--) {

			element.removeChild(element.childNodes[i]);
		}

		if (object) {

			children.forEach(function(child) {

				element.appendChild(child);
			});

			BindingRoot.bindObject(element, object);
		}
	},
	this,
	element);
};

BindingRoot.With.prototype = new Subscriber();
