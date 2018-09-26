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


/**
 * refreshes results for search, delete everything from the datalist and then
 * adds all the results from results into the datalist
 * @param  {[{postId, Title}, ]} results
 */
function refreshSearchResults(results) {
	// remove everything
	let datalist = $('#suggestions');
	datalist.empty();
	results.forEach(function(result) {
		// datalist options different from select options, displays what's inside the value attribute
		datalist.append("<option data-value='" + "/post/" + result.postID + "' value='" + result.title + "'>");
	});
}

function autoCompleteSearch(event) {
	window.clearTimeout(searchTimeout);

	let searchInput = this;
	// empty
	if (searchInput.value === "") {
		return;
	}
	// if result is cached, use cached value instead
	let searchQuery = searchInput.value.trim().toLowerCase();
	if (autoCompleteCache[searchQuery] !== undefined) {
		refreshSearchResults(autoCompleteCache[searchQuery]);
	} else {
		searchTimeout = window.setTimeout(function() {
			console.log('sending request... with query: ' + searchQuery);
			$.ajax({
				url: '/autocomplete',
				type: 'POST',
				contentType: 'application/json',
				dataType: 'json',
				data: JSON.stringify({
					searchQuery: searchQuery
				}),
				success: function(res) {
					// remember to store results in cache
					console.log(res.searchResults);
					autoCompleteCache[searchQuery] = res.searchResults;
					refreshSearchResults(res.searchResults);
				},
				error: function(xhr, status, error) {
					console.log("search attempt failed for query:" + searchQuery);
				},
			});
			// don't allow ajax to be sent unless user has stopped typing for 300ms
		}, 500);
	}
}
$('.search input').on('input', autoCompleteSearch);


function getUserSearchResult(event) {
	// build url

}
$('.search input').on('keydown', getUserSearchResult);


function getAutoCompleteResult(event) {
	console.log('test');
}
$('#suggestions').on('change', getAutoCompleteResult);
