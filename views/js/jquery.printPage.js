/**
 * jQuery printPage Plugin
 * @version: 1.0
 * @author: Cedric Dugas, http://www.position-absolute.com
 * @licence: MIT
 * @desciption: jQuery page print plugin help you print your page in a better way
 */

(function( $ ){
    $.fn.printPage = function(options) {
        // EXTEND options for this button
        var pluginOptions = {
            attr : "href",
            url : false,
            showMessage: false,
            message: "Идёт подготовка документа" ,
            afterCallback: null,
            beforeCallBack: null,
            urlCallBack: false
        };
        $.extend(pluginOptions, options);

        this.on("click", function(){ loadPrintDocument(this, pluginOptions); return false; });

        /**
         * Load & show message box, call iframe
         * @param {jQuery} el - The button calling the plugin
         * @param {Object} pluginOptions - options for this print button
         */
        function loadPrintDocument(el, pluginOptions){
            if($.isFunction(pluginOptions.beforeCallback)) {
                $.call(this,pluginOptions.beforeCallback);
            }
            if(pluginOptions.showMessage){
                $("body").append(components.messageBox(pluginOptions.message));
                $("#printMessageBox").css("opacity", 0);
                $("#printMessageBox").animate({opacity:1}, 300, function() { addIframeToPage(el, pluginOptions); });
            } else {
                addIframeToPage(el, pluginOptions);
            }
        }

        /**
         * Fire function to getting print url if is defined in options
         *
         * @param {jQuery} el - The button calling the plugin
         * @param {Object} pluginOptions - options for this print button
         */
        function getURL(el, pluginOptions) {
            if ($.isFunction(pluginOptions.urlCallBack)) {
                return pluginOptions.urlCallBack();
            } else {
                return (pluginOptions.url) ? pluginOptions.url : $(el).attr(pluginOptions.attr);
            }
        }

        /**
         * Inject iframe into document and attempt to hide, it, can't use display:none
         * You can't print if the element is not dsplayed
         * @param {jQuery} el - The button calling the plugin
         * @param {Object} pluginOptions - options for this print button
         */
        function addIframeToPage(el, pluginOptions){
            var url = getURL(el, pluginOptions);
            pluginOptions.id = (pluginOptions.id) ? pluginOptions.id : $(el).attr('id');
            if (pluginOptions.id == undefined) pluginOptions.id = '';

            if(!$('#printPage')[0]){
                $("body").append(components.iframe(url));
                $('#printPage').attr("src", url);
                $('#printPage').on("load",function() {  printit(pluginOptions);  });
            }else{
                $('#printPage').attr("src", url);
            }
        }
        /*
         * Call the print browser functionnality, focus is needed for IE
         */
        function printit(){

            var selector = 'printPage' + pluginOptions.id;

            frames.printPage.focus();
            frames.printPage.print();
            if(pluginOptions.showMessage){
                unloadMessage();
            }

            if($.isFunction(pluginOptions.afterCallback)) {
                $.call(this,pluginOptions.afterCallback);
            }
        }
        /*
         * Hide & Delete the message box with a small delay
         */
        function unloadMessage(){
            $("#printMessageBox").delay(1000).animate({opacity:0}, 700, function(){
                $(this).remove();
            });
        }
        /*
         * Build html compononents for thois plugin
         */
        var components = {
            iframe: function(url){
                return '<iframe id="printPage'+pluginOptions.id+'" name="printPage'+pluginOptions.id+'" ' +
                    'src="url" style="position: absolute; top: -1000px; @media print { display: block; }"></iframe>';
            },
            messageBox: function(message){
                return "<div id='printMessageBox'"+message+"</div>";
            }
        };
    };
})( jQuery );