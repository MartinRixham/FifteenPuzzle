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

	this.tiles = [

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
		new Tile(15)
	];

	function Tile(number) {

		this.number = new Binding({

			text: function() { return number; }
		});
	}
}

document.addEventListener("DOMContentLoaded", function() {

	new BindingRoot(fifteenPuzzle = new FifteenPuzzle());
});
