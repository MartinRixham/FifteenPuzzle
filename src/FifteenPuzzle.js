function FifteenPuzzle() {

	this.imageURL = "";

	this.imageURLBox = new Binding({

		value: function (value) {

			if (value != undefined) {

				this.imageURL = value;
			}

			return this.imageURL;
		}
	});

	this.tiles =
		[
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
			new Tile(15),
			new Space()
		];

	var tiles = this.tiles;

	function getRandomTileIndex() {

		return Math.floor(Math.random() * 15);
	}

	(function shuffleTiles(remainingShuffles) {

		if (remainingShuffles > 0) {

			var index = getRandomTileIndex();

			tiles[index].trySwap();

			setTimeout(function () {

				shuffleTiles(--remainingShuffles)
			}, 10);
		}
	})(1000);

	function Tile(number) {

		this.trySwap = function () {

			if (this.isAdjacentToSpace()) {

				var spaceIndex = this.getSpaceIndex();
				var myIndex = this.getMyIndex();

				tiles.splice(myIndex, 1, new Space());
				tiles.splice(spaceIndex, 1, this);
			}
		};

		this.isSpace = function () {

			return false;
		};

		this.number = new Binding({

			click: function () {

				this.trySwap()
			},
			init: function (element) {

				var image = element.querySelector("img");
				var horizontalOffset = ((number - 1) % 4) * -100;

				if (image) {

					image.style.marginLeft = horizontalOffset + "%";
					var verticalOffset = (Math.floor((number - 1) / 4)) * -100;
					image.style.marginTop = verticalOffset + "%";
				}
			}
		});

		this.getSpaceIndex = function () {

			for (var i = 0; i < tiles.length; i++) {

				if (tiles[i] instanceof Space) {

					return i;
				}
			}
		};

		this.getMyIndex = function () {

			for (var i = 0; i < tiles.length; i++) {

				if (this == tiles[i]) {

					return i;
				}
			}
		};

		this.isAdjacentToSpace = function () {

			var myIndex = this.getMyIndex();
			var isAdjacentToSpace = false;

			[-4, -1, 1, 4].forEach(function(index) {

				var neighbour = tiles[myIndex + index];

				if (neighbour && neighbour.isSpace()) {

					isAdjacentToSpace = true;
				}
			});

			return isAdjacentToSpace;
		};
	}

	function Space() {

		this.number = new Text(function() { return ""; });

		this.trySwap = function () {};

		this.isSpace = function () {

			return true;
		};
	}
}

document.addEventListener("DOMContentLoaded", function () {

	new BindingRoot(fifteenPuzzle = new FifteenPuzzle());
});
