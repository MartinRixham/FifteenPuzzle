(function (factory) {

	if (typeof define === "function" && define.amd) {

		define([], factory);
	}
	else if (typeof module === "object" && module.exports) {

		module.exports = factory();
	}
	else {

		factory(this);
	}
})(function(context) {

	context = context || function() { return context.Datum.apply(this, arguments); };

	var callback_binding_DestroyBinding = (function () {

		function DestroyBinding(destroy) {

			var parentModel;

			this.setUpElement = function(model) {

				parentModel = model;
			};

			this.updateElement = function() {};

			this.resetElement = function(element) {

				destroy.call(parentModel, element);
			};

			this.call = function() {

				init.apply(this, arguments);
			};
		}

		return DestroyBinding;
	})();

	var property_TransientProperty = (function () {

		function TransientProperty(property, propertyType) {

			var binding;

			if (property && isBinding(property)) {

				binding = property;
			}
			else if (property instanceof Array) {

				binding = propertyType.createArrayBinding(property);
			}
			else if (property && typeof(property) == "object") {

				binding = propertyType.createViewModel(property);
			}

			this.applyBinding = function(element, model, key) {

				if (binding) {

					binding.applyBinding(element, model, key);
				}
			};

			function isBinding(object){

				return object && object.applyBinding && object.removeBinding;
			}

			this.removeBinding = function() {

				if (binding) {

					binding.removeBinding();
				}
			};

			this.isOlderThan = function(other) {

				if (typeof property == "object" || typeof other == "object") {

					return other && property != other;
				}
				else {

					return false;
				}
			};
		}

		return TransientProperty;
	})();

	var array_ArrayItemElement = (function () {

		 function ArrayItemElement(element) {

			var index = 0;

			this.clone = function() {

				var clone = element.cloneNode(true);

				number(clone, index++);

				return clone;
			};

			function number(element, index) {

				if (element.id) {

					element.id = element.id + "_" + index;
				}

				if (element.hasAttribute("name")) {

					var name = element.getAttribute("name") + "_" + index;

					element.setAttribute("name", name);
				}

				for (var i = 0; i < element.children.length; i++) {

					number(element.children[i], index);
				}
			}

			this.get = function() {

				return element;
			};
		}

		return ArrayItemElement;
	})();

	var array_method_Pop_ = (function () {

		function Pop(model, elements, properties) {

			var originalPop = model.pop;

			model.pop = function() {

				var popped = originalPop.apply(this, arguments);
				var property = properties.pop();

				if (property) {

					property.removeBinding();
				}

				for (var i = 0; i < elements.length; i++) {

					elements[i].removeLast();
				}

				model.subscribableLength = model.length;

				return popped;
			};
		}

		return Pop;
	})();

	var array_method_Push = (function (TransientProperty) {

		function Push(model, elements, properties, propertyType) {

			var originalPush = model.push;

			model.push = function() {

				originalPush.apply(this, arguments);

				for (var i = 0; i < arguments.length; i++) {

					var property = new TransientProperty(arguments[i], propertyType);

					properties.push(property);

					for (var j = 0; j < elements.length; j++) {

						var element = elements[j];
						var finalIndex = properties.length - 1;

						element.append();
						property.applyBinding(element.getChildAtIndex(finalIndex), model);
					}
				}

				model.subscribableLength = model.length;
			};
		}

		return Push;
	})(property_TransientProperty);

	var array_method_Reverse = (function () {

		function Reverse(model, elements, properties) {

			var originalReverse = model.reverse;

			model.reverse = function() {

				originalReverse.apply(this, arguments);

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];
					var children = element.removeChildren();

					element.appendChildren(children.reverse());
				}

				properties.reverse();
			};
		}

		return Reverse;
	})();

	var array_method_Shift = (function () {

		function Shift(model, elements, properties) {

			var originalShift = model.shift;

			model.shift = function() {

				var shifted = originalShift.apply(this, arguments);
				var property = properties.shift();

				if (property) {

					property.removeBinding();
				}

				for (var i = 0; i < elements.length; i++) {

					elements[i].removeFirst();
				}

				model.subscribableLength = model.length;

				return shifted;
			};
		}

		return Shift;
	})();

	var array_method_Sort = (function () {

		function Sort(model, elements, properties) {

			model.sort = function(comparison) {

				var modelChildrenProperties = getModelChildrenProperties();

				modelChildrenProperties.sort(function(a, b) {

					return comparison(a.model, b.model);
				});

				replaceSortedObjects(modelChildrenProperties);
			};

			function getModelChildrenProperties() {

				var allChildren = getAllChildren();
				var modelChildrenProperties = [];

				for (var i = 0; i < model.length; i++) {

					modelChildrenProperties.push({

						model: model[i],
						property: properties[i],
						children: allChildren[i]
					});
				}

				return modelChildrenProperties;
			}

			function getAllChildren() {

				var allChildren = [];

				for (var i = 0; i < elements.length; i++) {

					var children = elements[i].removeChildren();

					for (var j = 0; j < children.length; j++) {

						if (!allChildren[j]) {

							allChildren[j] = [];
						}

						allChildren[j][i] = children[j];
					}
				}

				return allChildren;
			}

			function replaceSortedObjects(modelChildrenProperties) {

				for (var i = 0; i < model.length; i++) {

					model[i] = modelChildrenProperties[i].model;
					properties[i] = modelChildrenProperties[i].property;

					for (var j = 0; j < elements.length; j++) {

						elements[j].appendChild(modelChildrenProperties[i].children[j]);
					}
				}
			}
		}

		return Sort;
	})();

	var array_method_Splice = (function (TransientProperty) {

		function Splice(model, elements, properties, propertyType) {

			var originalSplice = model.splice;

			model.splice = function(start, deleteCount) {

				start = normaliseStart(start);
				var newObjects = [].slice.call(arguments, 2);

				removeObjects(start, deleteCount);
				insertObjects(start, newObjects);

				var spliced = originalSplice.apply(this, arguments);
				model.subscribableLength = model.length;

				return spliced;
			};

			function normaliseStart(start) {

				if (start < 0) {

					start = model.length + start;
				}

				start = Math.min(model.length, start);
				start = Math.max(0, start);

				return start;
			}

			function removeObjects(start, deleteCount) {

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];
					var end = Math.min(start + deleteCount, model.length) - 1;

					for (var j = end; j >= start; j--) {

						element.removeAtIndex(j);
					}

					properties.splice(start, deleteCount);
				}
			}

			function insertObjects(start, newObjects) {

				for (var i = newObjects.length - 1; i >= 0; i--) {

					var property = new TransientProperty(newObjects[i], propertyType);

					properties.splice(start, 0, property);

					for (var j = 0; j < elements.length; j++) {

						var element = elements[j];

						element.insertAtIndex(start);
						property.applyBinding(element.getChildAtIndex(start), model);
					}
				}
			}
		}

		return Splice;
	})(property_TransientProperty);

	var array_method_Unshift = (function (TransientProperty) {

		function Unshift(model, elements, properties, propertyType) {

			var originalUnshift = model.unshift;

			model.unshift = function() {

				originalUnshift.apply(this, arguments);

				for (var i = arguments.length - 1; i >= 0; i--) {

					var property = new TransientProperty(arguments[i], propertyType);

					properties.unshift(property);

					for (var j = 0; j < elements.length; j++) {

						var element = elements[j];

						element.prepend();
						property.applyBinding(element.getChildAtIndex(0), model);
					}
				}

				model.subscribableLength = model.length;
			};
		}

		return Unshift;
	})(property_TransientProperty);

	var tracking_Dependant = (function () {

		function Dependant(callback, binding, element) {

			this.call = function(value) {

				callback(value);
			};

			this.removedFromDocument = function() {

				return element.removedFromDocument();
			};

			this.equals = function(other) {

				return other.hasEqual(binding, element);
			};

			this.hasEqual = function(otherBinding, otherElement) {

				return binding == otherBinding && element.equals(otherElement);
			};
		}

		return Dependant;
	})();

	var root_DOMWatcher = (function () {

		function DOMWatcher(scope) {

			var observer = new MutationObserver(function(mutations) {

				var mutation = mutations[0];
				var notTextMutation = mutation.target.children.length;

				if (notTextMutation) {

					var element = mutation.target;

					rebindElement(element);
				}
			});

			function rebindElement(element) {

				if (element && element.__DATUM__REBIND) {

					element.__DATUM__REBIND();
				}
				else if (element) {

					rebindElement(element.parentElement);
				}
			}

			observer.observe(scope, { childList: true, subtree: true });

			this.disconnect = function() {

				observer.disconnect();
			};
		}

		return DOMWatcher;
	})();

	var tracking_Registry = (function () {

		var registry = [];

		var registering = false;

		function Registry() {

			// The registry, the registering flag
			// and the following three methods
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
			// the updater to any datum which supplied an assigner.
			// If in the future the value of a datum which has been
			// assigned the updater changes the datum will call the
			// updater which will update the elements which are bound
			// to the binding.
			this.registerUpdaterAssigner = function(assigner) {

				if (registering) {

					registry.push(assigner);
				}
			};

			this.requestRegistrations = function() {

				registry = [];
				registering = true;
			};

			this.assignUpdater = function(dependant) {

				for (var i = 0; i < registry.length; i++) {

					registry[i](dependant);
				}

				registering = false;
			};
		}

		return Registry;
	})();

	var property_PermanentProperty = (function () {

		function PermanentProperty(property, propertyType, scope) {

			var objectBinding;
			var propertyInjected = false;

			if (typeof(property) == "object" && !isBinding(property)) {

				objectBinding = propertyType.createObjectBinding(scope);
			}

			this.applyBinding = function(element, model, key) {

				if (typeof(property) != "function" &&
					!isBinding(property) &&
					!propertyInjected) {

					propertyType.injectProperty(property, model, key);
					propertyInjected = true;
				}

				if (objectBinding) {

					objectBinding.applyBinding(element, model, key);
				}
			};

			function isBinding(object) {

				return object && object.applyBinding && object.removeBinding;
			}

			this.removeBinding = function() {

				if (objectBinding) {

					objectBinding.removeBinding();
				}
			};
		}

		return PermanentProperty;
	})();

	var object_Serialisable = (function () {

		function Serialisable(model) {

			if (!model.toJSON)
			model.toJSON = function() {

				var json = {};

				if (model instanceof Array) {

					json = [];
				}

				for (var key in model) {

					var property = model[key];

					if (property &&
						property.toJSON &&
						typeof(property) == "object" &&
						(!property.applyBinding || property instanceof Array)) {

						json[key] = property.toJSON();
					}

					if (!property ||
						(typeof(property) != "object" &&
						typeof(property) != "function")) {

						json[key] = property;
					}
				}

				return json;
			};
		}

		return Serialisable;
	})();

	var object_ObjectElement = (function () {

		function ObjectElement(element) {

			var children = [].slice.call(element.childNodes);

			this.removeChildren = function() {

				var children = element.childNodes;

				for (var i = children.length - 1; i >= 0; i--) {

					element.removeChild(children[i]);
				}
			};

			this.replaceChildren = function() {

				for (var i = 0; i < children.length; i++) {

					element.appendChild(children[i]);
				}
			};

			this.removedFromDocument = function() {

				return !document.contains(element);
			};

			this.equals = function(other) {

				return other.hasEqual(element);
			};

			this.hasEqual = function(otherElement) {

				return element == otherElement;
			};
		}

		return ObjectElement;
	})();

	var element_NullDOMElement = (function () {

		function NullDOMElement() {

			this.hasInScope = function() {

				return false;
			};

			this.isInScope = function() {

				return true;
			};

			this.removedFromDocument = function() {

				return true;
			};

			this.getMatchingElements = function() {

				return [];
			};

			this.hasDataBindAttribute = function() {

				return false;
			};

			this.createRebinder = function() {};

			this.callBindingCallback = function() {};

			this.equals = function(other) {

				return other instanceof NullDOMElement;
			};

			this.hasEqual = function() {

				return false;
			};

			this.get = function() {

				return null;
			};
		}

		return NullDOMElement;
	})();

	var element_ElementSet = (function () {

		function ElementSet() {

			var elements = [];

			this.add = function(element) {

				if (isNew(element)) {

					elements.push(element);
				}
			};

			function isNew(element) {

				var isNew = true;

				for (var i = 0; i < elements.length; i++) {

					if (elements[i].equals(element)) {

						isNew = false;
					}
				}

				return isNew;
			}

			this.removeOld = function() {

				var removed = [];

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					if (element.removedFromDocument()) {

						elements.splice(i, 1);
						removed.push(element);
					}
				}

				return removed;
			};

			this.getElementEqualTo = function(element) {

				for (var i = 0; i < elements.length; i++) {

					if (elements[i].equals(element)) {

						return elements[i];
					}
				}
			};

			this.contains = function(element) {

				return !isNew(element);
			};

			this.remove = function(element) {

				for (var i = 0; i < elements.length; i++) {

					if (elements[i].equals(element)) {

						elements.splice(i, 1);
					}
				}
			};

			this.get = function() {

				return elements;
			};
		}

		return ElementSet;
	})();

	var callback_binding_VisibleBinding = (function () {

		function VisibleBinding(visible) {

			this.setUpElement = function() {};

			this.updateElement = function(parentModel, element) {

				if (visible.call(parentModel, element)) {

					element.style.display = null;
				}
				else {

					element.style.display = "none";
				}
			};

			this.resetElement = function(element) {

				element.style.display = null;
			};

			this.call = function(parentModel, element) {

				return visible.call(parentModel, element);
			};
		}

		return VisibleBinding;
	})();

	var callback_binding_ValueBinding = (function () {

		function ValueBinding(value) {

			var listeners = [];

			this.setUpElement = function(parentModel, element) {

				function listener(event) {

					value.call(parentModel, event.target.value, element);
				}

				listeners.push({ element: element, listener: listener });
				element.addEventListener("change", listener);
			};

			this.updateElement = function(parentModel, element) {

				element.value = value.call(parentModel, undefined, element);
			};

			this.resetElement = function(element) {

				for (var i = 0; i < listeners.length; i++) {

					var listener = listeners[i];

					if (listener.element == element) {

						element.removeEventListener("change", listener.listener);
						element.value = "";
						break;
					}
				}

				listeners.splice(i, 1);
			};

			this.call = function(parentModel, val, element) {

				return value.call(parentModel, val, element);
			};
		}

		return ValueBinding;
	})();

	var callback_binding_UpdateBinding = (function () {

		function UpdateBinding(update) {

			this.setUpElement = function() {};

			this.updateElement = function(parentModel, element) {

				update.call(parentModel, element);
			};

			this.resetElement = function() {};

			this.call = function(parentModel, element) {

				update.call(parentModel, element);
			};
		}

		return UpdateBinding;
	})();

	var callback_binding_ClassesBinding = (function () {

		function ClassesBinding(callbacks) {

			this.setUpElement = function() {};

			this.updateElement = function(parentModel, element) {

				var classes = splitClasses(element);

				for (var key in callbacks) {

					var index = classes.indexOf(key);

					if (callbacks[key].call(parentModel, element)) {

						if (index < 0) {

							classes.push(key);
						}
					}
					else {

						if (index + 1) {

							classes.splice(index, 1);
						}
					}
				}

				element.className = classes.join(" ");
			};

			function splitClasses(element) {

				var classes;

				if (element.className) {

					classes = element.className.split(" ");
				}
				else {

					classes = [];
				}

				return classes;
			}

			this.resetElement = function() {};

			this.call = function(parentModel, element) {

				for (var key in callbacks) {

					callbacks[key].call(parentModel, element);
				}
			};
		}

		return ClassesBinding;
	})();

	var callback_binding_TextBinding = (function () {

		function TextBinding(text) {

			this.setUpElement = function() {};

			this.updateElement = function(parentModel, element) {

				element.textContent = text.call(parentModel, element);
			};

			this.resetElement = function(element) {

				element.textContent = "";
			};

			this.call = function(parentModel, element) {

				return text.call(parentModel, element);
			};
		}

		return TextBinding;
	})();

	var callback_binding_EventsBinding = (function () {

		function EventsBinding(callbacks) {

			var listeners = [];

			this.setUpElement = function(model, element) {

				for (var key in callbacks) {

					var callback = callbacks[key];

					var listener = createListener(model, element, callback);

					listeners.push({ key: key, element: element, listener: listener });
					element.addEventListener(key, listener);
				}
			};

			function createListener(model, element, callback) {

				return function listener() {

					callback.call(model, element);
				};
			}

			this.updateElement = function() {};

			this.resetElement = function(element) {

				for (var i = 0; i < listeners.length; i++) {

					var listener = listeners[i];

					if (listener.element == element) {

						element.removeEventListener(listener.key, listener.listener);
					}
				}

				listeners.splice(i, 1);
			};

			this.call = function(parentModel, element) {

				for (var key in callbacks) {

					callbacks[key].call(parentModel, element);
				}
			};
		}

		return EventsBinding;
	})();

	var callback_binding_InitBinding = (function () {

		function InitBinding(init) {

			this.setUpElement = function(model, element) {

				init.call(model, element);
			};

			this.updateElement = function() {};

			this.resetElement = function() {};

			this.call = function() {

				init.apply(this, arguments);
			};
		}

		return InitBinding;
	})();

	context.Datum = (function (
		ElementSet,
		Registry) {

		function Datum(datum) {

			var dependants = new ElementSet();

			function provider(value) {

				if (typeof value == "undefined" || value instanceof Node) {

					return get();
				}
				else {

					set(value);
				}
			}

			function get() {

				new Registry().registerUpdaterAssigner(assigner);

				return datum;
			}

			function assigner(dependant) {

				dependants.add(dependant);
			}

			function set(value) {

				datum = value;

				dependants.removeOld();
				updateDependants(value);
			}

			function updateDependants(value) {

				var dependantArray = dependants.get();

				for (var i = 0; i < dependantArray.length; i++) {

					dependantArray[i].call(value);
				}
			}

			return provider;
		}

		return Datum;
	})(element_ElementSet, tracking_Registry);

	var callback_CallbackBinder = (function (
		ElementSet,
		Dependant,
		Registry) {

		function CallbackBinder(binding) {

			var parentModel;

			var boundElements = new ElementSet();

			this.applyBinding = function(element, model) {

				parentModel = model;

				removeOldBindings();

				bindElements(element, model);
				boundElements.add(element);
			};

			function removeOldBindings() {

				var removed = boundElements.removeOld();

				for (var i = 0; i < removed.length; i++) {

					var element = removed[i].get();

					if (element) {

						binding.resetElement(element);
					}
				}
			}

			function bindElements(element, model) {

				if (element.get() && !boundElements.contains(element)) {

					binding.setUpElement(model, element.get());
					new Registry().requestRegistrations();
					binding.updateElement(model, element.get());
					createCallback(model, element);
				}
			}

			function createCallback(model, element) {

				var running = false;

				function callback(value) {

					if (!running) {

						running = true;
						binding.updateElement(model, element.get(), value);
						running = false;
					}
				}

				new Registry().assignUpdater(new Dependant(callback, binding, element));
			}

			this.removeBinding = function() {

				var elements = boundElements.get();

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i].get();

					if (element) {

						binding.resetElement(element);
					}
				}

				parentModel = null;
			};

			this.test = {

				call: function() {

					var testArguments = [].slice.call(arguments);
					testArguments.unshift(parentModel);

					return binding.call.apply(binding, testArguments);
				}
			};
		}

		return CallbackBinder;
	})(element_ElementSet, tracking_Dependant, tracking_Registry);

	context.Destroy = (function (
		DestroyBinding,
		CallbackBinder) {

		function Destroy(destroy) {

			return new CallbackBinder(new DestroyBinding(destroy));
		}

		return Destroy;
	})(callback_binding_DestroyBinding, callback_CallbackBinder);

	context.Update = (function (
		UpdateBinding,
		CallbackBinder) {

		function Update(update) {

			return new CallbackBinder(new UpdateBinding(update));
		}

		return Update;
	})(callback_binding_UpdateBinding, callback_CallbackBinder);

	context.Binding = (function (
		CallbackBinder,
		TextBinding,
		ValueBinding,
		EventsBinding,
		InitBinding,
		UpdateBinding,
		VisibleBinding,
		DestroyBinding,
		ClassesBinding) {

		function Binding(callbacks) {

			var bindings = [];

			if (callbacks.text) {

				bindings.push(new CallbackBinder(new TextBinding(callbacks.text)));
			}

			if (callbacks.value) {

				bindings.push(new CallbackBinder(new ValueBinding(callbacks.value)));
			}

			if (callbacks.click) {

				bindings.push(
					new CallbackBinder(new EventsBinding({ click: callbacks.click })));
			}

			if (callbacks.init) {

				bindings.push(new CallbackBinder(new InitBinding(callbacks.init)));
			}

			if (callbacks.update) {

				bindings.push(new CallbackBinder(new UpdateBinding(callbacks.update)));
			}

			if (callbacks.destroy) {

				bindings.push(new CallbackBinder(new DestroyBinding(callbacks.destroy)));
			}

			if (callbacks.visible) {

				bindings.push(new CallbackBinder(new VisibleBinding(callbacks.visible)));
			}

			if (callbacks.events) {

				bindings.push(new CallbackBinder(new EventsBinding(callbacks.events)));
			}

			if (callbacks.classes) {

				bindings.push(new CallbackBinder(new ClassesBinding(callbacks.classes)));
			}

			var parentModel = null;

			function applyBinding(element, model) {

				parentModel = model;

				for (var i = 0; i < bindings.length; i++) {

					bindings[i].applyBinding(element, model);
				}
			}

			function removeBinding() {

				for (var i = 0; i < bindings.length; i++) {

					bindings[i].removeBinding();
				}
			}

			var test = {};

			Object.keys(callbacks).forEach(function(key) {

				test[key] = function(element) {

					callbacks[key].call(parentModel, element);
				};
			});

			return {

				applyBinding: applyBinding,
				removeBinding: removeBinding,
				test: test
			};
		}

		return Binding;
	})(callback_CallbackBinder, callback_binding_TextBinding, callback_binding_ValueBinding, callback_binding_EventsBinding, callback_binding_InitBinding, callback_binding_UpdateBinding, callback_binding_VisibleBinding, callback_binding_DestroyBinding, callback_binding_ClassesBinding);

	context.Text = (function (
		TextBinding,
		CallbackBinder) {

		function Text(text) {

			return new CallbackBinder(new TextBinding(text));
		}

		return Text;
	})(callback_binding_TextBinding, callback_CallbackBinder);

	context.Init = (function (
		InitBinding,
		CallbackBinder) {

		function Init(init) {

			return new CallbackBinder(new InitBinding(init));
		}

		return Init;
	})(callback_binding_InitBinding, callback_CallbackBinder);

	var array_ArrayElement = (function (ArrayItemElement) {

		function ArrayElement(domElement, initialLength) {

			var element = domElement.get();
			var child;

			(function checkElementHasOnlyOneChild() {

				if (element.children.length != 1) {

					var message =
						"An array must be bound to an element with exactly one child.";
					throw new Error(message);
				}
			})();

			(function createRebinder() {

				domElement.createRebinder(function() {});
			})();

			(function getChild() {

				var childElement = element.children[0];

				element.removeChild(childElement);

				child = new ArrayItemElement(childElement);
			})();

			(function copyElement() {

				for (var i = 0; i < initialLength; i++) {

					element.appendChild(child.clone());
				}
			})();

			this.append = function() {

				element.appendChild(child.clone());
			};

			this.prepend = function() {

				element.insertBefore(child.clone(), element.firstChild);
			};

			this.insertAtIndex = function(index) {

				element.insertBefore(child.clone(), element.children[index]);
			};

			this.removeFirst = function() {

				if (element.firstElementChild) {

					element.removeChild(element.firstElementChild);
				}
			};

			this.removeLast = function() {

				if (element.lastElementChild) {

					element.removeChild(element.lastElementChild);
				}
			};

			this.removeAtIndex = function(index) {

				element.removeChild(element.children[index]);
			};

			this.removeChildren = function() {

				var children = [].slice.call(element.children);

				while (element.lastChild) {

					element.removeChild(element.lastChild);
				}

				return children;
			};

			this.appendChildren = function(children) {

				for (var i = 0; i < children.length; i++) {

					element.appendChild(children[i]);
				}
			};

			this.appendChild = function(child) {

				element.appendChild(child);
			};

			this.reset = function() {

				while (element.lastChild) {

					element.removeChild(element.lastChild);
				}

				element.appendChild(child.get());
			};

			this.getChildAtIndex = function(i) {

				return domElement.createElement(element.children[i]);
			};

			this.removedFromDocument = function() {

				return domElement.removedFromDocument();
			};

			this.equals = function(other) {

				return other.hasEqual(element);
			};

			this.hasEqual = function(otherElement) {

				return element == otherElement;
			};

			this.get = function() {

				return domElement;
			};
		}

		return ArrayElement;
	})(array_ArrayItemElement);

	var object_ObjectBinding = (function (
		ElementSet,
		Registry,
		Dependant) {

		function ObjectBinding(scope) {

			var self = this;

			var removed = false;

			var boundElements = new ElementSet();

			this.applyBinding = function(element, model, name) {

				var removed = boundElements.removeOld();
				resetElements(removed);

				if (element.get()) {

					bindElements(element, model, name);
				}
			};

			function bindElements(element, model, name) {

				if (boundElements.contains(element)) {

					updateElement(element, model && model[name]);
				}
				else {

					boundElements.add(element.toObjectElement());
					new Registry().requestRegistrations();
					updateElement(element, model && model[name]);
					createCallback(scope, element);
				}
			}

			function updateElement(element, model) {

				var objectElement = boundElements.getElementEqualTo(element);

				if (model) {

					if (removed) {

						removed = false;
						objectElement.replaceChildren();
					}
				}
				else {

					removed = true;
					objectElement.removeChildren();
				}
			}

			function createCallback(scope, element) {

				var running = false;

				function callback() {

					if (!running) {

						running = true;
						scope.rebind();
						running = false;
					}
				}

				new Registry().assignUpdater(new Dependant(callback, self, element));
			}

			this.removeBinding = function() {

				var elements = boundElements.get();

				resetElements(elements);
			};

			function resetElements(elements) {

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					element.replaceChildren();
					boundElements.remove(element);
				}
			}
		}

		return ObjectBinding;
	})(element_ElementSet, tracking_Registry, tracking_Dependant);

	context.Events = (function (
		EventsBinding,
		CallbackBinder) {

		function Events(callbacks) {

			return new CallbackBinder(new EventsBinding(callbacks));
		}

		return Events;
	})(callback_binding_EventsBinding, callback_CallbackBinder);

	context.Visible = (function (
		VisibleBinding,
		CallbackBinder) {

		function Visible(visible) {

			return new CallbackBinder(new VisibleBinding(visible));
		}

		return Visible;
	})(callback_binding_VisibleBinding, callback_CallbackBinder);

	context.Value = (function (
		ValueBinding,
		CallbackBinder) {

		function Value(value) {

			return new CallbackBinder(new ValueBinding(value));
		}

		return Value;
	})(callback_binding_ValueBinding, callback_CallbackBinder);

	context.Click = (function (
		EventsBinding,
		CallbackBinder) {

		function Click(click) {

			return new CallbackBinder(new EventsBinding({ click: click }));
		}

		return Click;
	})(callback_binding_EventsBinding, callback_CallbackBinder);

	context.Classes = (function (
		ClassesBinding,
		CallbackBinder) {

		function Classes(callbacks) {

			return new CallbackBinder(new ClassesBinding(callbacks));
		}

		return Classes;
	})(callback_binding_ClassesBinding, callback_CallbackBinder);

	var array_ArrayBinding = (function (
		ElementSet,
		Registry,
		TransientProperty,
		Datum,
		Push,
		Pop,
		Shift,
		Unshift,
		Reverse,
		Sort,
		Splice) {

		function ArrayBinding(model, propertyType) {

			var properties = [];
			var boundElements = new ElementSet();

			(function createProperties() {

				for (var i = 0; i < model.length; i++) {

					properties.push(new TransientProperty(model[i], propertyType));
				}
			})();

			(function createArrayMethods() {

				var elements = boundElements.get();

				new Push(model, elements, properties, propertyType);
				new Pop(model, elements, properties);
				new Shift(model, elements, properties);
				new Unshift(model, elements, properties, propertyType);
				new Reverse(model, elements, properties);
				new Sort(model, elements, properties);
				new Splice(model, elements, properties, propertyType);
			})();

			(function createSubscribableLength() {

				var length = new Datum(model.length);

				Object.defineProperty(model, "subscribableLength", {

					get: function() {

						return length();
					},
					set: function(value) {

						length(value);
					}
				});
			})();

			this.applyBinding = function(element, parentModel, name) {

				var removed = boundElements.removeOld();
				resetElements(removed);

				if (element.get()) {

					bindElements(element, parentModel, name);
				}
			};

			function bindElements(element, parentModel, name) {

				if (!boundElements.contains(element)) {

					boundElements.add(element.toArrayElement(model.length));
				}

				var arrayElement = boundElements.getElementEqualTo(element);
				var value = parentModel[name];

				for (var i = 0; i < properties.length; i++) {

					properties[i].applyBinding(arrayElement.getChildAtIndex(i), value);
				}
			}

			this.removeBinding = function() {

				var elements = boundElements.get();

				resetElements(elements);
			};

			function resetElements(elements) {

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					if (element.get()) {

						element.reset();
						boundElements.remove(element);
					}
				}
			}
		}

		return ArrayBinding;
	})(element_ElementSet, tracking_Registry, property_TransientProperty, context.Datum, array_method_Push, array_method_Pop_, array_method_Shift, array_method_Unshift, array_method_Reverse, array_method_Sort, array_method_Splice);

	var property_PropertyType = (function (
		Datum,
		ObjectBinding,
		ArrayBinding) {

		function PropertyType(createViewModel) {

			this.injectProperty = function(property, model, key) {

				var datum = new Datum(property);

				Object.defineProperty(model, key, {

					get: function() {

						return datum();
					},
					set: function(value) {

						datum(value);
					}
				});
			};

			this.createViewModel = function(model) {

				return createViewModel(model);
			};

			this.createObjectBinding = function(scope) {

				return new ObjectBinding(scope);
			};

			this.createArrayBinding = function(model) {

				return new ArrayBinding(model, this);
			};
		}

		return PropertyType;
	})(context.Datum, object_ObjectBinding, array_ArrayBinding);

	var object_ViewModel = (function (
		ElementSet,
		Serialisable,
		TransientProperty,
		PermanentProperty,
		PropertyType,
		NullDOMElement) {

		function ViewModel(model) {

			var boundElements = new ElementSet();
			var transientProperties = {};
			var permanentProperties = {};

			new Serialisable(model);

			this.applyBinding = applyBinding;

			function applyBinding(element) {

				boundElements.removeOld();

				if (!boundElements.contains(element)) {

					createRebinder(element);
					element.callBindingCallback(model);
				}

				unbindOldProperties();
				createPermanentProperties(element);
				createTransientProperties();
				bindProperties(element);
				boundElements.add(element);
			}

			function createRebinder(element) {

				element.createRebinder(function() {

					applyBinding(element);
				});
			}

			function unbindOldProperties() {

				for (var key in transientProperties) {

					if (!model[key]) {

						transientProperties[key].removeBinding();
						delete transientProperties[key];
					}
				}
			}

			function createPermanentProperties(element) {

				for (var key in model) {

					if (!permanentProperties[key]) {

						permanentProperties[key] =
							new PermanentProperty(model[key], createPropertyType(), element);
					}
				}
			}

			function createTransientProperties() {

				for (var key in model) {

					if (isNew(key)) {

						if (transientProperties[key]) {

							transientProperties[key].removeBinding();
						}

						transientProperties[key] =
							new TransientProperty(model[key], createPropertyType());
					}
				}
			}

			function isNew(key) {

				var property = transientProperties[key];

				return !property || property.isOlderThan(model[key]);
			}

			function createPropertyType() {

				return new PropertyType(function(model) { return new ViewModel(model); });
			}

			function bindProperties(scope) {

				for (var key in permanentProperties) {

					var elements = getElements(scope, key);

					for (var i = 0; i < elements.length; i++) {

						var element = elements[i];

						permanentProperties[key].applyBinding(element, model, key);
						transientProperties[key].applyBinding(element, model, key);
					}
				}
			}

			function getElements(scope, name) {

				var elements = scope.getMatchingElements(name);

				return elements.length ? elements : [new NullDOMElement()];
			}

			this.removeBinding = function() {

				for (var key in permanentProperties) {

					permanentProperties[key].removeBinding();
					transientProperties[key].removeBinding();
				}
			};
		}

		return ViewModel;
	})(element_ElementSet, object_Serialisable, property_TransientProperty, property_PermanentProperty, property_PropertyType, element_NullDOMElement);

	var element_DOMElement = (function (
		ObjectElement,
		ArrayElement) {

		function DOMElement(element) {

			this.isInScope = function(scope) {

				return isInScope(element, scope);
			};

			function isInScope(element, scope) {

				var currentElement = element.parentElement;

				if (!currentElement) {

					return false;
				}
				else if (currentElement == scope) {

					return true;
				}
				else if (currentElement.__DATUM__REBIND) {

					return false;
				}
				else {

					return isInScope(currentElement, scope);
				}
			}

			this.removedFromDocument = function() {

				return !document.contains(element);
			};

			this.getMatchingElements = function(key) {

				var elements = element.querySelectorAll("[data-bind=" + key + "]");
				var elementsArray = [];

				for (var i = 0; i < elements.length; i++) {

					var newElement = new DOMElement(elements[i]);

					if (newElement.isInScope(element)) {

						elementsArray.push(newElement);
					}
				}

				return elementsArray;
			};

			this.hasDataBindAttribute = function(name) {

				return element.dataset.bind == name;
			};

			this.createRebinder = function(rebinder) {

				element.__DATUM__REBIND = rebinder;
			};

			this.rebind = function() {

				element.__DATUM__REBIND();
			};

			this.callBindingCallback = function(model) {

				if (model.onBind) {

					model.onBind(element);
				}
			};

			this.equals = function(other) {

				return other.hasEqual(element);
			};

			this.hasEqual = function(otherElement) {

				return element == otherElement;
			};

			this.toObjectElement = function() {

				return new ObjectElement(element);
			};

			this.toArrayElement = function(initialLength) {

				return new ArrayElement(this, initialLength);
			};

			this.get = function() {

				return element;
			};

			this.createElement = function(element) {

				return new DOMElement(element);
			};
		}

		return DOMElement;
	})(object_ObjectElement, array_ArrayElement);

	context.BindingRoot = (function (
		ViewModel,
		DOMWatcher,
		DOMElement) {

		var flag = false;

		function BindingRoot(model) {

			(function checkModelType() {

				if (typeof model != "object") {

					throw new Error("The binding root must be an object.");
				}

				if (model instanceof Array) {

					throw new Error("The binding root cannot be an array.");
				}
			})();

			(function assertUniqueness() {

				if (flag) {

					throw new Error(
						"The binding root is unique and " +
						"cannot be instantiated multiple times.");
				}
				else {

					flag = true;
				}
			})();

			var rootViewModel = new ViewModel(model);
			rootViewModel.applyBinding(new DOMElement(document.body));

			var domWatcher = new DOMWatcher(document.body);

			function disconnect() {

				domWatcher.disconnect();
			}

			return {

				disconnect: disconnect
			};
		}

		return BindingRoot;
	})(object_ViewModel, root_DOMWatcher, element_DOMElement);

	var element_RootDOMElement = (function (DOMElement) {

		function RootDOMElement() {

			this.hasInScope = function(other) {

				return other.isInScope(document.body);
			};

			this.getMatchingElements = function() {

				return [new DOMElement(document.body)];
			};

			this.createRebinder = function() {};

			this.callBindingCallback = function() {};
		}

		return RootDOMElement;
	})(element_DOMElement);

	return context;
});
