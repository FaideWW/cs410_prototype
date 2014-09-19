// Foundation JavaScript
// Documentation can be found at: http://foundation.zurb.com/docs
$(document).foundation();

(function ($) {
    $(document).ready(function () {
        $.ajax('jquery.xml', {
            success: function (data) {
                console.log(data);
            }
        })
    })
}(jQuery));