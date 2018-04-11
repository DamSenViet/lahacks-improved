searchTimeout = null;

$('.select-wrapper select').change(function(evt) {
	window.location.href = this.value;
});
