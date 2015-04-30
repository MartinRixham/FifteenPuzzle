function FifteenPuzzle() {

	this.imageURL = "";

	this.imageURLBox = new Binding({

		value: function(value) {

			if (value != undefined) {

				this.imageURL = value;
			}

			return this.imageURL;
		}
	});

	var self = this;

	this.tiles = [

		new Tile(1, function() { return self.tiles; }),
		new Tile(2, function() { return self.tiles; }),
		new Tile(3, function() { return self.tiles; }),
		new Tile(4, function() { return self.tiles; }),
		new Tile(5, function() { return self.tiles; }),
		new Tile(6, function() { return self.tiles; }),
		new Tile(7, function() { return self.tiles; }),
		new Tile(8, function() { return self.tiles; }),
		new Tile(9, function() { return self.tiles; }),
		new Tile(10, function() { return self.tiles; }),
		new Tile(11, function() { return self.tiles; }),
		new Tile(12, function() { return self.tiles; }),
		new Tile(13, function() { return self.tiles; }),
		new Tile(14, function() { return self.tiles; }),
		new Tile(15, function() { return self.tiles; }),
		new Space()
	];

	function Tile(number, tilesAccessor) {

		this.number = new Binding({

			text: function() { return number; },
			click: function() {

				if (this.isAdjacentToSpace()) {

					var tiles = tilesAccessor();

					var spaceIndex = this.getSpaceIndex();
					var myIndex = this.getMyIndex();

					tiles.splice(myIndex, 1, new Space());
					tiles.splice(spaceIndex, 1, this);
				}
			}
		});

		this.getSpaceIndex = function() {

			var tiles = tilesAccessor();

			for (var i = 0; i < tiles.length; i++) {

				if (tiles[i] instanceof Space) {

					return i;
				}
			}
		};

		this.getMyIndex = function() {

			var tiles = tilesAccessor();

			for (var i = 0; i < tiles.length; i++) {

				if (this == tiles[i]) {

					return i;
				}
			}
		};

		this.isAdjacentToSpace = function() {

			var tiles = tilesAccessor();

			var myIndex = this.getMyIndex();

			if (tiles[myIndex - 1] instanceof Space) {

				return true;
			}

			if (tiles[myIndex + 1] instanceof Space) {

				return true;
			}

			if (tiles[myIndex - 4] instanceof Space) {

				return true;
			}

			if (tiles[myIndex + 4] instanceof Space) {

				return true;
			}

			return false;
		};
	}

	function Space() {

	}
}

document.addEventListener("DOMContentLoaded", function() {

	new BindingRoot(fifteenPuzzle = new FifteenPuzzle());
});
