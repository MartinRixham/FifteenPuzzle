function FifteenPuzzle() {

	var imageURL = "";

	this.imageURLInput = new Binding({

		value: function (value) {

			if (value) {

				imageURL = value;
				this.puzzle = new Puzzle(value);
			}

			return imageURL;
		}
	});

	this.puzzle = new Puzzle("");

	function Puzzle(imageURL) {

		this.tiles =
			[
				new Tile(0),
				new Tile(1),
				new Tile(2),
				new Tile(3),
				new Tile(4),
				new Tile(5),
				new Tile(6),
				new Tile(7),
				new Tile(8),
				new Tile(9),
				new Tile(10),
				new Tile(11),
				new Tile(12),
				new Tile(13),
				new Tile(14),
				new Space()
			];

		var tiles = this.tiles;

		(function shuffleTiles(remainingShuffles) {

			if (remainingShuffles > 0) {

				var index = getRandomTileIndex();

				tiles[index].trySwap();

				setTimeout(function () {

					shuffleTiles(--remainingShuffles);
				}, 10);
			}
		})(1000);

		function getRandomTileIndex() {

			return Math.floor(Math.random() * 15);
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

					var image = element.querySelector("img");
					var horizontalOffset = (number % 4) * -100;
					var verticalOffset = Math.floor(number / 4) * -100;

					image.style.marginLeft = horizontalOffset + "%";
					image.style.marginTop = verticalOffset + "%";
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
				var isAdjacentToSpace = false;

				[-4, -1, 1, 4].forEach(function (index) {

					var neighbour = tiles[myIndex + index];

					if (neighbour && neighbour.isSpace()) {

						isAdjacentToSpace = true;
					}
				});

				return isAdjacentToSpace;
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

			this.trySwap = function () {
			};

			this.isSpace = function () {

				return true;
			};
		}
	}
}

document.addEventListener("DOMContentLoaded", function () {

	new BindingRoot(fifteenPuzzle = new FifteenPuzzle());
});
