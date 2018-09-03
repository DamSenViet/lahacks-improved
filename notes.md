
### Loading Images (high resolution at full resolution)
* Couldn't preload images IN ORDER without tying up main thread
	* Tried new Image() JavaScript object and .onload method via src = url, didn't work
	* Caused serious performance issues almost completely stopping animations
	* Possible solutions: save image, but let another server apply compression
