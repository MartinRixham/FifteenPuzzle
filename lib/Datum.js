(function (factory) {

	if (typeof define === "function" && define.amd) {

		define(factory);
	} else if (typeof module === "object" && module.exports) {

		factory(module.exports);
	} else {

		factory(this);
	}
})(function(context) {

	context = context || {};

	var TransientProperty = (function () {

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

			this.applyBinding = function(scope, key, model) {

				if (binding) {

					binding.applyBinding(scope, key, model);
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

	var Push = (function (TransientProperty) {

		function Push(model, elementChildren, properties, propertyType) {

			var originalPush = model.push;

			model.push = function() {

				for (var i = 0; i < arguments.length; i++) {

					var object = arguments[i];
					var property = new TransientProperty(object, propertyType);

					properties.push(property);

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;
						var child = elementChildren[j].child;

						element.appendChild(child.clone());
						property.applyBinding(element, properties.length - 1, object);
					}
				}

				originalPush.apply(this, arguments);
				model.subscribableLength = model.length;
			};
		}

		return Push;
	})(TransientProperty);

	var Sort = (function () {

		function Sort(model, elementChildren, properties) {

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

				for (var i = 0; i < elementChildren.length; i++) {

					var element = elementChildren[i].element;
					var children = [].slice.call(element.children);

					removeChildren(element);

					for (var j = 0; j < children.length; j++) {

						if (!allChildren[j]) {

							allChildren[j] = [];
						}

						allChildren[j][i] = children[j];
					}
				}

				return allChildren;
			}

			function removeChildren(element) {

				while (element.lastChild) {

					element.removeChild(element.lastChild);
				}
			}

			function replaceSortedObjects(modelChildrenProperties) {

				for (var i = 0; i < model.length; i++) {

					model[i] = modelChildrenProperties[i].model;
					properties[i] = modelChildrenProperties[i].property;

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;

						element.appendChild(modelChildrenProperties[i].children[j]);
					}
				}
			}


		}

		return Sort;
	})();

	var Dependant = (function () {

		function Dependant(callback, binding, element) {

			this.call = function(value) {

				callback(value);
			};

			this.removedFromDocument = function() {

				return !document.contains(element);
			};

			this.equals = function(other) {

				return other.hasEqual(binding, element);
			};

			this.hasEqual = function(otherBinding, otherElement) {

				return binding == otherBinding && element == otherElement;
			};
		}

		return Dependant;
	})();

	var Rebinder = (function () {

		var rebind = null;

		var rebindRequested = false;

		function Rebinder() {

			// The rebind callback, the rebind requested flag
			// and the following three methods
			// organise the application of new bindings.
			// After the binding root has performed the initial binding
			// it supplies a rebinding callback to the registry.
			// When a new binding is instantiated it requests a rebinding.
			// The rebinding is then initialised by the next datum to be called.
			this.registerRebinder = function(callback) {

				rebind = callback;
			};

			this.rebindDataStructure = function() {

				if (rebind && rebindRequested) {

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

		return Rebinder;
	})();

	var Pop_ = (function () {

		function Pop(model, elementChildren, properties) {

			var originalPop = model.pop;

			model.pop = function() {

				var property = properties.pop();

				if (property) {

					property.removeBinding();
				}

				for (var i = 0; i < elementChildren.length; i++) {

					var element = elementChildren[i].element;

					if (element.lastElementChild) {

						element.removeChild(element.lastElementChild);
					}
				}

				originalPop.apply(this, arguments);
				model.subscribableLength = model.length;
			};
		}

		return Pop;
	})();

	var Unshift = (function (TransientProperty) {

		function Unshift(model, elementChildren, properties, propertyType) {

			var originalUnshift = model.unshift;

			model.unshift = function() {

				for (var i = arguments.length - 1; i >= 0; i--) {

					var object = arguments[i];
					var property = new TransientProperty(object, propertyType);

					properties.unshift(property);

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;
						var child = elementChildren[j].child;

						element.insertBefore(child.clone(), element.firstChild);
						property.applyBinding(element, 0, object);
					}
				}

				originalUnshift.apply(this, arguments);
				model.subscribableLength = model.length;
			};
		}

		return Unshift;
	})(TransientProperty);

	var ArrayElement = (function () {

		 function ArrayElement(element) {

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

				if (element.hasAttribute && element.hasAttribute("name")) {

					var name = element.getAttribute("name") + "_" + index;

					element.setAttribute("name", name);
				}

				if (element.children) {

					for (var i = 0; i < element.children.length; i++) {

						number(element.children[i], index);
					}
				}
			}

			this.get = function() {

				return element;
			};
		}

		return ArrayElement;
	})();

	var Registry = (function () {

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

	var Reverse = (function () {

		function Reverse(model, elementChildren, properties) {

			var originalReverse = model.reverse;

			model.reverse = function() {

				for (var i = 0; i < elementChildren.length; i++) {

					var element = elementChildren[i].element;
					var children = [].slice.call(element.children);

					removeChildren(element);
					replaceChildrenReversed(element, children);
				}

				properties.reverse();
				originalReverse.apply(this, arguments);
			};

			function removeChildren(element) {

				while (element.lastChild) {

					element.removeChild(element.lastChild);
				}
			}

			function replaceChildrenReversed(element, children) {

				for (var j = children.length - 1; j >= 0; j--) {

					element.appendChild(children[j]);
				}
			}
		}

		return Reverse;
	})();

	var Shift = (function () {

		function Shift(model, elementChildren, properties) {

			var originalShift = model.shift;

			model.shift = function() {

				var property = properties.shift();

				if (property) {

					property.removeBinding();
				}

				for (var i = 0; i < elementChildren.length; i++) {

					var element = elementChildren[i].element;

					if (element.firstElementChild) {

						element.removeChild(element.firstElementChild);
					}
				}

				originalShift.apply(this, arguments);
				model.subscribableLength = model.length;
			};
		}

		return Shift;
	})();

	var Splice = (function (TransientProperty) {

		function Splice(model, elementChildren, properties, propertyType) {

			var originalSplice = model.splice;

			model.splice = function(start, deleteCount) {

				start = normaliseStart(start);
				var newObjects = [].slice.call(arguments, 2);

				removeObjects(start, deleteCount);
				insertObjects(start, newObjects);

				originalSplice.apply(this, arguments);
				model.subscribableLength = model.length;
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

				for (var i = 0; i < elementChildren.length; i++) {

					var element = elementChildren[i].element;
					var end = Math.min(start + deleteCount, model.length) - 1;

					for (var j = end; j >= start; j--) {

						element.removeChild(element.children[j]);
					}

					properties.splice(start, deleteCount);
				}
			}

			function insertObjects(start, newObjects) {

				for (var i = newObjects.length - 1; i >= 0; i--) {

					var object = newObjects[i];
					var property = new TransientProperty(object, propertyType);

					properties.splice(start, 0, property);

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;
						var child = elementChildren[j].child;

						element.insertBefore(child.clone(), element.children[start]);
						property.applyBinding(element, start, object);
					}
				}
			}
		}

		return Splice;
	})(TransientProperty);

	context.Datum = (function (Registry, Rebinder) {

		function Datum(datum) {

			var dependants = [];

			function provider(value) {

				if (typeof value == "undefined") {

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

				if (dependantNotRegistered(dependant)) {

					dependants.push(dependant);
				}
			}

			function dependantNotRegistered(dependant) {

				var containsDependant = false;

				for (var i = 0; i < dependants.length; i++) {

					if (dependants[i].equals(dependant)) {

						containsDependant = true;
					}
				}

				return !containsDependant;
			}

			function set(value) {

				datum = value;

				forgetRemovedDependants();
				updateDependants(value);

				new Rebinder().rebindDataStructure();
			}

			function forgetRemovedDependants() {

				for (var i = 0; i < dependants.length; i++) {

					var dependant = dependants[i];

					if (dependant.removedFromDocument()) {

						dependants.splice(i, 1);
					}
				}
			}

			function updateDependants(value) {

				for (var i = 0; i < dependants.length; i++) {

					dependants[i].call(value);
				}
			}

			return provider;
		}

		return Datum;
	})(Registry, Rebinder);

	var PermanentProperty = (function () {

		function PermanentProperty(property, propertyType) {

			var objectBinding;

			var propertyInjected = false;

			if (typeof(property) == "object" && !isBinding(property)) {

				objectBinding = propertyType.createObjectBinding();
			}

			this.applyBinding = function(scope, key, model) {

				if (typeof(property) != "function" &&
					!isBinding(property) &&
					!propertyInjected) {

					propertyType.injectProperty(property, model, key);
					propertyInjected = true;
				}

				if (objectBinding) {

					objectBinding.applyBinding(scope, key, model);
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

	var ArrayBinding = (function (
		ArrayElement,
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

			var elementChildren = [];

			(function createProperties() {

				for (var i = 0; i < model.length; i++) {

					properties.push(new TransientProperty(model[i], propertyType));
				}
			})();

			(function createArrayMethods() {

				new Push(model, elementChildren, properties, propertyType);
				new Pop(model, elementChildren, properties);
				new Shift(model, elementChildren, properties);
				new Unshift(model, elementChildren, properties, propertyType);
				new Reverse(model, elementChildren, properties);
				new Sort(model, elementChildren, properties);
				new Splice(model, elementChildren, properties, propertyType);
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

			this.setUpElement = function(parentModel, element, model) {

				element._rebind = function() {};

				checkElementHasOnlyOneChild(element);

				var child = getChildFromDOM(element);

				elementChildren.push({ element: element, child: child });

				for (var i = 0; i < model.length; i++) {

					element.appendChild(child.clone());
				}
			};

			function checkElementHasOnlyOneChild(element) {

				if (element.children.length != 1) {

					var message =
						"An array must be bound to an element with exactly one child.";
					throw new Error(message);
				}
			}

			function getChildFromDOM(element) {

				var child = element.children[0];

				element.removeChild(child);

				return new ArrayElement(child);
			}

			this.updateElement = function(parentModel, element, value) {

				for (var i = 0; i < properties.length; i++) {

					properties[i].applyBinding(element, i, value);
				}
			};

			this.resetElement = function(element) {

				var child;

				for (var i = 0; i < elementChildren.length; i++) {

					if (element == elementChildren[i].element) {

						child = elementChildren[i].child;
						elementChildren.splice(i, 1);
					}
				}

				while (element.lastChild) {

					element.removeChild(element.lastChild);
				}

				element.appendChild(child.get());
			};
		}

		return ArrayBinding;
	})(ArrayElement, TransientProperty, context.Datum, Push, Pop_, Shift, Unshift, Reverse, Sort, Splice);

	var TextBinding = (function () {

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

	var ClickBinding = (function () {

		function ClickBinding(click) {

			var listeners = [];

			this.setUpElement = function(model, element) {

				function listener() {

					click.call(model, element);
				}

				listeners.push({ "element": element, "listener": listener });
				element.addEventListener("click", listener);
			};

			this.updateElement = function() {};

			this.resetElement = function(element) {

				var i;

				for (i = 0; i < listeners.length; i++) {

					var listener = listeners[i];

					if (listener.element == element) {

						element.removeEventListener("click", listener.listener);
						break;
					}
				}

				listeners.splice(i, 1);
			};

			this.call = function(parentModel, element) {

				click.call(parentModel, element);
			};
		}

		return ClickBinding;
	})();

	var Binder = (function (Rebinder, Dependant, Registry) {

		function Binder(binding) {

			var parentModel;

			var boundElements = [];

			var running = false;

			new Rebinder().requestRebind();

			this.applyBinding = function(scope, name, model) {

				parentModel = model;

				var elements = getMatchingElements(scope, name);

				removeOldBindings();
				bindElements(elements, scope, model, name);

				[].push.apply(boundElements, elements);
			};

			function getMatchingElements(scope, key) {

				if (isNaN(key)) {

					return [].slice.call(scope.querySelectorAll("[data-bind=" + key + "]"));
				}
				else {

					return [scope.children[key]];
				}
			}

			function removeOldBindings() {

				for (var i = 0; i < boundElements.length; i++) {

					var boundElement = boundElements[i];

					if (removedFromDocument(boundElement)) {

						binding.resetElement(boundElement);
						boundElements.splice(i, 1);
					}
				}
			}

			function removedFromDocument(element) {

				return !document.contains(element);
			}

			function bindElements(elements, scope, model, name) {

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					if (isInScope(element, scope)) {

						if (boundElements.indexOf(element) + 1) {

							binding.updateElement(model, element, model && model[name]);
						}
						else {

							binding.setUpElement(model, element, model && model[name]);
							new Registry().requestRegistrations();
							binding.updateElement(model, element, model && model[name]);
							createCallback(model, element);
						}
					}
				}
			}

			function isInScope(element, scope) {

				element = element.parentElement;

				if (!element) {

					return true;
				}
				else if (element._rebind) {

					return element == scope;
				}
				else {

					return isInScope(element, scope);
				}
			}

			function createCallback(model, element) {

				function callback(value) {

					if (!running) {

						running = true;
						binding.updateElement(model, element, value);
						running = false;
					}
				}

				new Registry().assignUpdater(new Dependant(callback, binding, element));
			}

			this.removeBinding = function() {

				for (var i = 0; i < boundElements.length; i++) {

					binding.resetElement(boundElements[i]);
				}

				boundElements = [];
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

		return Binder;
	})(Rebinder, Dependant, Registry);

	var ValueBinding = (function () {

		function ValueBinding(value) {

			var listeners = [];

			this.setUpElement = function(parentModel, element) {

				function listener(event) {

					value.call(parentModel, event.target.value, element);
				}

				listeners.push({ "element": element, "listener": listener });
				element.addEventListener("change", listener);
			};

			this.updateElement = function(parentModel, element) {

				element.value = value.call(parentModel, undefined, element);
			};

			this.resetElement = function(element) {

				var i;

				for (i = 0; i < listeners.length; i++) {

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

	var DomWatcher = (function () {

		function DomWatcher(scope) {

			var observer = new MutationObserver(function(mutations) {

				var mutation = mutations[0];
				var notTextMutation = mutation.target.children.length;

				if (notTextMutation) {

					var element = mutation.target;

					rebindElement(element);
				}
			});

			function rebindElement(element) {

				if (element && element._rebind) {

					element._rebind();
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

		return DomWatcher;
	})();

	var Serialisable = (function () {

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

	var UpdateBinding = (function () {

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

	var InitBinding = (function () {

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

	var ObjectBinding = (function () {

		function ObjectBinding() {

			var elementChildren = [];

			this.setUpElement = function(parentModel, element) {

				var children = [].slice.call(element.childNodes);

				elementChildren.push({ "element": element, "children": children });
			};

			this.updateElement = function(parentModel, element, model) {

				var children;

				if (model) {

					for (var i = 0; i < elementChildren.length; i++) {

						if (elementChildren[i].element == element) {

							children = elementChildren[i].children;
							break;
						}
					}

					if (!element.childNodes.length) {

						for (var j = 0; j < children.length; j++) {

							element.appendChild(children[j]);
						}
					}
				}
				else {

					children = element.childNodes;

					for (var k = children.length - 1; k >= 0; k--) {

						element.removeChild(children[k]);
					}
				}
			};

			this.resetElement = function(element) {

				var children;

				for (var i = 0; i < elementChildren.length; i++) {

					if (elementChildren[i].element == element) {

						children = elementChildren[i].children;
						elementChildren.splice(i, 1);
						break;
					}
				}

				if (!element.childNodes.length) {

					for (var j = 0; j < children.length; j++) {

						element.appendChild(children[j]);
					}
				}
			};
		}

		return ObjectBinding;
	})();

	var VisibleBinding = (function () {

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

	var PropertyType = (function (
		Datum,
		Binder,
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

			this.createObjectBinding = function() {

				return new Binder(new ObjectBinding());
			};

			this.createArrayBinding = function(model) {

				return new Binder(new ArrayBinding(model, this));
			};
		}

		return PropertyType;
	})(context.Datum, Binder, ObjectBinding, ArrayBinding);

	var ViewModel = (function (
		Serialisable,
		TransientProperty,
		PermanentProperty,
		PropertyType) {

		function ViewModel(model) {

			var transientProperties = {};

			var permanentProperties = {};

			new Serialisable(model);

			this.applyBinding = applyBinding;

			function applyBinding(scope, name) {

				var elements = getElements(scope, name);

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					if (!element || isInScope(element, scope)) {

						createRebinder(element, scope, name);
						callBindingCallback(element);
						unbindOldProperties();
						createPermanentProperties();
						createTransientProperties();
						bindProperties(element);
					}
				}
			}

			function getElements(scope, name) {

				if (scope) {

					var elements = getMatchingElements(scope, name);

					return elements.length ? elements : [null];
				}
				else {

					return [document.body];
				}
			}

			function isInScope(element, scope) {

				element = element.parentElement;

				if (!element) {

					return true;
				}
				else if (element._rebind) {

					return element == scope;
				}
				else {

					return isInScope(element, scope);
				}
			}

			function getMatchingElements(scope, key) {

				if (isNaN(key)) {

					return [].slice.call(scope.querySelectorAll("[data-bind=" + key + "]"));
				}
				else {

					return [scope.children[key]];
				}
			}

			function createRebinder(element, scope, name) {

				if (element) {

					element._rebind = function() {

						applyBinding(scope, name);
					};
				}
			}

			function callBindingCallback(element) {

				if (model.onBind) {

					model.onBind(element);
				}
			}

			function unbindOldProperties() {

				for (var key in transientProperties) {

					if (!model[key]) {

						transientProperties[key].removeBinding();
						delete transientProperties[key];
					}
				}
			}

			function createPermanentProperties() {

				for (var key in model) {

					if (!permanentProperties[key]) {

						permanentProperties[key] =
							new PermanentProperty(model[key], createPropertyType());
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

				return !property ||
					property.isOlderThan &&
					property.isOlderThan(model[key]);
			}

			function createPropertyType() {

				return new PropertyType(function(model) { return new ViewModel(model); });
			}

			function bindProperties(element) {

				var key;

				for (key in permanentProperties) {

					permanentProperties[key].applyBinding(element, key, model);
				}

				for (key in transientProperties) {

					transientProperties[key].applyBinding(element, key, model);
				}
			}

			this.removeBinding = function() {

				var key;

				for (key in permanentProperties) {

					permanentProperties[key].removeBinding();
				}

				for (key in transientProperties) {

					transientProperties[key].removeBinding();
				}
			};
		}

		return ViewModel;
	})(Serialisable, TransientProperty, PermanentProperty, PropertyType);

	context.Click = (function (ClickBinding, Binder) {

		function Click(click) {

			return new Binder(new ClickBinding(click));
		}

		return Click;
	})(ClickBinding, Binder);

	context.Update = (function (UpdateBinding, Binder) {

		function Update(update) {

			return new Binder(new UpdateBinding(update));
		}

		return Update;
	})(UpdateBinding, Binder);

	context.Text = (function (TextBinding, Binder) {

		function Text(text) {

			return new Binder(new TextBinding(text));
		}

		return Text;
	})(TextBinding, Binder);

	context.Value = (function (ValueBinding, Binder) {

		function Value(value) {

			return new Binder(new ValueBinding(value));
		}

		return Value;
	})(ValueBinding, Binder);

	context.Binding = (function (
		Binder,
		TextBinding,
		ValueBinding,
		ClickBinding,
		InitBinding,
		UpdateBinding,
		VisibleBinding) {

		function Binding(callbacks) {

			var bindings = [];

			if (callbacks.text) {

				bindings.push(new Binder(new TextBinding(callbacks.text)));
			}

			if (callbacks.value) {

				bindings.push(new Binder(new ValueBinding(callbacks.value)));
			}

			if (callbacks.click) {

				bindings.push(new Binder(new ClickBinding(callbacks.click)));
			}

			if (callbacks.init) {

				bindings.push(new Binder(new InitBinding(callbacks.init)));
			}

			if (callbacks.update) {

				bindings.push(new Binder(new UpdateBinding(callbacks.update)));
			}

			if (callbacks.visible) {

				bindings.push(new Binder(new VisibleBinding(callbacks.visible)));
			}

			var parentModel = null;

			this.applyBinding = function(scope, name, model) {

				parentModel = model;

				for (var i = 0; i < bindings.length; i++) {

					bindings[i].applyBinding(scope, name, model);
				}
			};

			this.removeBinding = function() {

				for (var i = 0; i < bindings.length; i++) {

					bindings[i].removeBinding();
				}
			};

			var test = {};

			Object.keys(callbacks).forEach(function(key) {

				test[key] = function(element) {

					callbacks[key].call(parentModel, element);
				};
			});

			this.test = test;
		}

		return Binding;
	})(Binder, TextBinding, ValueBinding, ClickBinding, InitBinding, UpdateBinding, VisibleBinding);

	context.Init = (function (InitBinding, Binder) {

		function Init(init) {

			return new Binder(new InitBinding(init));
		}

		return Init;
	})(InitBinding, Binder);

	context.Visible = (function (VisibleBinding, Binder) {

		function Visible(visible) {

			return new Binder(new VisibleBinding(visible));
		}

		return Visible;
	})(VisibleBinding, Binder);

	context.BindingRoot = (function (
		ViewModel,
		DomWatcher,
		Rebinder) {

		var flag = false;

		function BindingRoot(model) {

			assertUniqueness();

			var rootViewModel = new ViewModel(model);
			rootViewModel.applyBinding();

			new Rebinder().registerRebinder(function() {

				rootViewModel.applyBinding();
			});

			var domWatcher = new DomWatcher(document.body);

			this.disconnect = function() {

				domWatcher.disconnect();
			};
		}

		function assertUniqueness() {

			if (flag) {

				throw new Error(
					"The binding root is unique and cannot be instantiated multiple times.");
			}
			else {

				flag = true;
			}
		}

		return BindingRoot;
	})(ViewModel, DomWatcher, Rebinder);

	return context;
});
