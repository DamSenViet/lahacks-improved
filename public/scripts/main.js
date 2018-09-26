searchTimeout = null;
// query -> [results,]
autoCompleteCache = {};


function capitalize(string) {
	string = string.toLowerCase();
	string = string.split(" "); //array now
	string = string.map((s) => s.charAt(0).toUpperCase() + s.substring(1));
	string = string.join(" ");
	return string;
}

function changeValues(event) {
	window.location.href = this.value;
}
$('.select-wrapper select').on('change', changeValues);

function getUserSearchResult(event) {
	// build url
	if (event.keyCode === 13) {
		// redirect
		window.location.href = "/search?searchQuery="
		+ window.encodeURIComponent(this.value.trim().toLowerCase());
	}
}
$('.search input').on('keydown', getUserSearchResult);
