function FifteenPuzzle() {

	var imageURL = "";

	var size = 5;

	var self = this;

	this.imageURLInput = new Binding({

		init: function(element) {

			element.value = imageURL;

			element.addEventListener("change", function() {

				imageURL = element.value;
				self.puzzle = new Puzzle(imageURL, size);
			});
		}
	});

	this.sizeInput = new Binding({

		init: function(element) {

			element.value = size;

			element.addEventListener("change", function() {

				size = ~~element.value;
				self.puzzle = new Puzzle(imageURL, size);
			});
		}
	});

	this.puzzle = new Puzzle(imageURL, size);

	function Puzzle(imageURL, size) {

		this.tiles = [];

		var numberOfTiles = Math.floor(size * size - 1);

		for (var i = 0; i < numberOfTiles; i++) {

			this.tiles.push(new Tile(i));
		}

		this.tiles.push(new Space());

		var tiles = this.tiles;

		var shuffles = Math.min(20 * size * size * size, 10000);

		function shuffleTiles(remainingShuffles) {

			if (remainingShuffles > 0) {

				var index = getRandomTileIndex();

				tiles[index].trySwap();

				setTimeout(function () {

					shuffleTiles(--remainingShuffles);
				}, Math.floor(5000 / shuffles));
			}
		}

		if (imageURL) {

			shuffleTiles(shuffles);
		}

		function getRandomTileIndex() {

			return Math.floor(Math.random() * size * size);
		}

		function Tile(number) {

			var self = this;

			this.trySwap = function () {

				if (isAdjacentToSpace()) {

					var spaceIndex = getSpaceIndex();
					var myIndex = getIndex();

					tiles.splice(myIndex, 1, new Space());
					tiles.splice(spaceIndex, 1, this);
				}
			};

			this.isSpace = function () {

				return false;
			};

			this.tile = new Binding({

				click: function () {

					this.trySwap()
				},
				init: function (element) {

					var tileWidth = (700 / size) - 2;
					element.style.width = tileWidth + "px";
					element.style.height = tileWidth + "px";

					var image = element.querySelector("img");
					var horizontalOffset = (number % size) * -100;
					var verticalOffset = Math.floor(number / size) * -100;

					image.style.marginLeft = horizontalOffset + "%";
					image.style.marginTop = verticalOffset + "%";
					image.style.height = (size * 100) + "%";
					image.style.width = (size * 100) + "%";
					image.src = imageURL;
				}
			});

			function getSpaceIndex() {

				for (var i = 0; i < tiles.length; i++) {

					if (tiles[i].isSpace()) {

						return i;
					}
				}
			}

			function isAdjacentToSpace() {

				var myIndex = getIndex();
				var neighbours = getNeighbours(myIndex);
				var isAdjacentToSpace = false;

				neighbours.forEach(function(index) {

					var neighbour = tiles[myIndex + index];

					if (neighbour && neighbour.isSpace()) {

						isAdjacentToSpace = true;
					}
				});

				return isAdjacentToSpace;
			}

			function getNeighbours(myIndex) {

				var neighbours = [size, -size];

				if (myIndex % size) {

					neighbours.push(-1);
				}

				if ((myIndex + 1) % size) {

					neighbours.push(1);
				}

				return neighbours;
			}

			function getIndex() {

				for (var i = 0; i < tiles.length; i++) {

					if (self == tiles[i]) {

						return i;
					}
				}
			}
		}

		function Space() {

			this.tile = new Binding({

				init: function (element) {

					var tileWidth = (700 / size) - 2;
					element.style.width = tileWidth + "px";
					element.style.height = tileWidth + "px";
				}
			});

			this.trySwap = function () {};

			this.isSpace = function () {

				return true;
			};
		}
	}
}

document.addEventListener("DOMContentLoaded", function () {

	new BindingRoot(fifteenPuzzle = new FifteenPuzzle());
});
