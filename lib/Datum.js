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

	var DOMElement = (function () {

		function DOMElement(element) {

			this.hasInScope = function(other) {

				return other.isInScope(element);
			};

			this.isInScope = function(scope) {

				return isInScope(element, scope);
			};

			function isInScope(element, scope) {

				var currentElement = element.parentElement;

				if (!currentElement) {

					return true;
				}
				else if (currentElement._rebind) {

					return currentElement == scope;
				}
				else {

					return isInScope(currentElement, scope);
				}
			}

			this.removedFromDocument = function() {

				return !document.contains(element);
			};

			this.getMatchingElements = function(key) {

				if (isNaN(key)) {

					var elements = element.querySelectorAll("[data-bind=" + key + "]");
					var elementsArray = [].slice.call(elements);

					return elementsArray.map(function(item) { return new DOMElement(item); });
				}
				else {

					return [new DOMElement(element.children[key])];
				}
			};

			this.createRebinder = function(rebinder) {

				if (element) {

					element._rebind = rebinder;
				}
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

			this.get = function() {

				return element;
			};
		}

		return DOMElement;
	})();

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

	var Pop_ = (function () {

		function Pop(model, elementChildren, properties) {

			var originalPop = model.pop;

			model.pop = function() {

				originalPop.apply(this, arguments);

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

				model.subscribableLength = model.length;
			};
		}

		return Pop;
	})();

	var ElementSet = (function () {

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

			this.contains = function(element) {

				return !isNew(element);
			};

			this.get = function() {

				return elements;
			};
		}

		return ElementSet;
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

	context.Datum = (function (
		ElementSet,
		Registry,
		Rebinder) {

		function Datum(datum) {

			var dependants = new ElementSet();

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

				dependants.add(dependant);
			}

			function set(value) {

				datum = value;

				dependants.removeOld();
				updateDependants(value);

				new Rebinder().rebindDataStructure();
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
	})(ElementSet, Registry, Rebinder);

	var Unshift = (function (TransientProperty, DOMElement) {

		function Unshift(model, elementChildren, properties, propertyType) {

			var originalUnshift = model.unshift;

			model.unshift = function() {

				originalUnshift.apply(this, arguments);

				for (var i = arguments.length - 1; i >= 0; i--) {

					var property = new TransientProperty(arguments[i], propertyType);

					properties.unshift(property);

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;
						var child = elementChildren[j].child;

						element.insertBefore(child.clone(), element.firstChild);
						property.applyBinding(new DOMElement(element), 0, model);
					}
				}

				model.subscribableLength = model.length;
			};
		}

		return Unshift;
	})(TransientProperty, DOMElement);

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

	var Dependant = (function () {

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

	var Push = (function (TransientProperty, DOMElement) {

		function Push(model, elementChildren, properties, propertyType) {

			var originalPush = model.push;

			model.push = function() {

				originalPush.apply(this, arguments);

				for (var i = 0; i < arguments.length; i++) {

					var property = new TransientProperty(arguments[i], propertyType);

					properties.push(property);

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;
						var child = elementChildren[j].child;
						var finalIndex = properties.length - 1;

						element.appendChild(child.clone());
						property.applyBinding(new DOMElement(element), finalIndex, model);
					}
				}

				model.subscribableLength = model.length;
			};
		}

		return Push;
	})(TransientProperty, DOMElement);

	var Reverse = (function () {

		function Reverse(model, elementChildren, properties) {

			var originalReverse = model.reverse;

			model.reverse = function() {

				originalReverse.apply(this, arguments);

				for (var i = 0; i < elementChildren.length; i++) {

					var element = elementChildren[i].element;
					var children = [].slice.call(element.children);

					removeChildren(element);
					replaceChildrenReversed(element, children);
				}

				properties.reverse();
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

				originalShift.apply(this, arguments);

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

				model.subscribableLength = model.length;
			};
		}

		return Shift;
	})();

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

	var Splice = (function (TransientProperty, DOMElement) {

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

					var property = new TransientProperty(newObjects[i], propertyType);

					properties.splice(start, 0, property);

					for (var j = 0; j < elementChildren.length; j++) {

						var element = elementChildren[j].element;
						var child = elementChildren[j].child;

						element.insertBefore(child.clone(), element.children[start]);
						property.applyBinding(new DOMElement(element), start, model);
					}
				}
			}
		}

		return Splice;
	})(TransientProperty, DOMElement);

	var ObjectBinder = (function (
		ElementSet,
		Dependant,
		Registry) {

		function ObjectBinder(binding) {

			var boundElements = new ElementSet();

			this.applyBinding = function(scope, name, model) {

				removeOldBindings();

				var elements = scope.getMatchingElements(name);

				bindElements(elements, scope, model, name);
				addElements(elements);
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

			function addElements(elements) {

				for (var i = 0; i < elements.length; i++) {

					boundElements.add(elements[i]);
				}
			}

			function bindElements(elements, scope, model, name) {

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					if (scope.hasInScope(element)) {

						if (boundElements.contains(element)) {

							binding.updateElement(model, element.get(), model && model[name]);
						}
						else {

							binding.setUpElement(model, element.get(), model && model[name]);
							new Registry().requestRegistrations();
							binding.updateElement(model, element.get(), model && model[name]);
							createCallback(model, element);
						}
					}
				}
			}

			function createCallback(model, element) {

				function callback(value) {

					binding.updateElement(model, element.get(), value);
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
			};
		}

		return ObjectBinder;
	})(ElementSet, Dependant, Registry);

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

	var DOMWatcher = (function () {

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

		return DOMWatcher;
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

	var CallbackBinder = (function (
		ElementSet,
		Rebinder,
		Dependant,
		Registry) {

		function CallbackBinder(binding) {

			var parentModel;

			var boundElements = new ElementSet();

			var running = false;

			new Rebinder().requestRebind();

			this.applyBinding = function(scope, name, model) {

				parentModel = model;

				removeOldBindings();

				var elements = scope.getMatchingElements(name);

				bindElements(elements, scope, model);
				addElements(elements);
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

			function addElements(elements) {

				for (var i = 0; i < elements.length; i++) {

					boundElements.add(elements[i]);
				}
			}

			function bindElements(elements, scope, model) {

				for (var i = 0; i < elements.length; i++) {

					var element = elements[i];

					if (scope.hasInScope(element)) {

						if (!boundElements.contains(element)) {

							binding.setUpElement(model, element.get());
							new Registry().requestRegistrations();
							binding.updateElement(model, element.get());
							createCallback(model, element);
						}
					}
				}
			}

			function createCallback(model, element) {

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
	})(ElementSet, Rebinder, Dependant, Registry);

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
		Splice,
		DOMElement) {

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

					properties[i].applyBinding(new DOMElement(element), i, value);
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
	})(ArrayElement, TransientProperty, context.Datum, Push, Pop_, Shift, Unshift, Reverse, Sort, Splice, DOMElement);

	var RootDOMElement = (function (DOMElement) {

		function RootDOMElement() {

			this.hasInScope = function(other) {

				return other.isInScope(document.body);
			};

			this.getMatchingElements = function() {

				return [new DOMElement(document.body)];
			};
		}

		return RootDOMElement;
	})(DOMElement);

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

	var NullDOMElement = (function () {

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

				return [new NullDOMElement()];
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
		ObjectBinder,
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

				return new ObjectBinder(new ObjectBinding());
			};

			this.createArrayBinding = function(model) {

				return new ObjectBinder(new ArrayBinding(model, this));
			};
		}

		return PropertyType;
	})(context.Datum, ObjectBinder, ObjectBinding, ArrayBinding);

	var ViewModel = (function (
		ElementSet,
		Serialisable,
		TransientProperty,
		PermanentProperty,
		PropertyType,
		DOMElement,
		NullDOMElement) {

		function ViewModel(model) {

			var boundElements = new ElementSet();

			var transientProperties = {};

			var permanentProperties = {};

			new Serialisable(model);

			this.applyBinding = applyBinding;

			function applyBinding(scope, name) {

				boundElements.removeOld();

				var elements = getElements(scope, name);

				for (var i = 0; i < elements.length; i++) {

					bindElement(elements[i], scope, name);
				}
			}

			function getElements(scope, name) {

				var elements = scope.getMatchingElements(name);

				return elements.length ? elements : [new NullDOMElement()];
			}

			function bindElement(element, scope, name) {

				if (scope.hasInScope(element)) {

					if (!boundElements.contains(element)) {

						createRebinder(element, scope, name);
						element.callBindingCallback(model);
					}

					unbindOldProperties();
					createPermanentProperties();
					createTransientProperties();
					bindProperties(element);
					boundElements.add(element);
				}
			}

			function createRebinder(element, scope, name) {

				element.createRebinder(function() {

					applyBinding(scope, name);
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

				return !property || property.isOlderThan(model[key]);
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
	})(ElementSet, Serialisable, TransientProperty, PermanentProperty, PropertyType, DOMElement, NullDOMElement);

	context.Click = (function (ClickBinding, CallbackBinder) {

		function Click(click) {

			return new CallbackBinder(new ClickBinding(click));
		}

		return Click;
	})(ClickBinding, CallbackBinder);

	context.Update = (function (
		UpdateBinding,
		CallbackBinder) {

		function Update(update) {

			return new CallbackBinder(new UpdateBinding(update));
		}

		return Update;
	})(UpdateBinding, CallbackBinder);

	context.Text = (function (TextBinding, CallbackBinder) {

		function Text(text) {

			return new CallbackBinder(new TextBinding(text));
		}

		return Text;
	})(TextBinding, CallbackBinder);

	context.Value = (function (ValueBinding, CallbackBinder) {

		function Value(value) {

			return new CallbackBinder(new ValueBinding(value));
		}

		return Value;
	})(ValueBinding, CallbackBinder);

	context.Binding = (function (
		CallbackBinder,
		TextBinding,
		ValueBinding,
		ClickBinding,
		InitBinding,
		UpdateBinding,
		VisibleBinding) {

		function Binding(callbacks) {

			var bindings = [];

			if (callbacks.text) {

				bindings.push(new CallbackBinder(new TextBinding(callbacks.text)));
			}

			if (callbacks.value) {

				bindings.push(new CallbackBinder(new ValueBinding(callbacks.value)));
			}

			if (callbacks.click) {

				bindings.push(new CallbackBinder(new ClickBinding(callbacks.click)));
			}

			if (callbacks.init) {

				bindings.push(new CallbackBinder(new InitBinding(callbacks.init)));
			}

			if (callbacks.update) {

				bindings.push(new CallbackBinder(new UpdateBinding(callbacks.update)));
			}

			if (callbacks.visible) {

				bindings.push(new CallbackBinder(new VisibleBinding(callbacks.visible)));
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
	})(CallbackBinder, TextBinding, ValueBinding, ClickBinding, InitBinding, UpdateBinding, VisibleBinding);

	context.Init = (function (InitBinding, CallbackBinder) {

		function Init(init) {

			return new CallbackBinder(new InitBinding(init));
		}

		return Init;
	})(InitBinding, CallbackBinder);

	context.Visible = (function (
		VisibleBinding,
		CallbackBinder) {

		function Visible(visible) {

			return new CallbackBinder(new VisibleBinding(visible));
		}

		return Visible;
	})(VisibleBinding, CallbackBinder);

	context.BindingRoot = (function (
		ViewModel,
		DOMWatcher,
		Rebinder,
		RootDOMElement) {

		var flag = false;

		function BindingRoot(model) {

			checkModelType(model);
			assertUniqueness();

			var rootViewModel = new ViewModel(model);
			rootViewModel.applyBinding(new RootDOMElement());

			new Rebinder().registerRebinder(function() {

				rootViewModel.applyBinding(new RootDOMElement());
			});

			var domWatcher = new DOMWatcher(document.body);

			this.disconnect = function() {

				domWatcher.disconnect();
			};
		}

		function checkModelType(model) {

			if (typeof model != "object") {

				throw new Error("The binding root must be an object.");
			}

			if (model instanceof Array) {

				throw new Error("The binding root cannot be an array.");
			}
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
	})(ViewModel, DOMWatcher, Rebinder, RootDOMElement);

	return context;
});
