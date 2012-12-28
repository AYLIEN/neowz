/*
 *  Project: neowz
 *  Description: RSS reader
 *  Author: parsaghaffari
 *  License: GPL
 */
;(function($) {
    var pluginName = 'neowz';

    function Plugin(element, options) {
        var el = element;
        var $el = $(element);

        // Extend default options with those supplied by user.
        options = $.extend({}, $.fn[pluginName].defaults, options);

        // Global story array
        var stories = [];
        var currentStoryIndex;

        // Page height hack
        var initialWinHeight = $(window).height();
        var initialBodyHeight = $('body').height();

        // Preserve page title
        var initialTitle = document.title;

        /**
         * Initialize plugin.
         */
        
        function init() {
            //Add any initialization logic here...
            initCanvas();

            if (options.stories !== undefined && options.stories.length > 0 && isValidStories(options.stories)) {
                initWithStories(options.stories, el, options);
            } else if (options.rss !== undefined && options.rss !== "") {
                initWithRSS(options.rss, el, options);
            } else {
                $.error("Neowz: either stories or RSS link must be provided.");
            }

            hook('onInit');
        }

        // --- Private Methods ---
        function initCanvas() {
            var neowz = $('<div id="neowz"></div>');
            $el.append(neowz);
            $el = $el.find("#neowz");

            $el.css({
                height: $(window).height(),
                width: $(window).width(),
                top: options.top,
                left: options.left,
                'z-index': options.zIndex
            });

            var html = '<div id="neowz-header"><div id="neowz-ticker"><ul></ul></div><div class="close"><a href="#"><img src="img/close.png"></a></div></div><div id="neowz-frame-container"><iframe id="neowz-frame" sandbox="allow-forms allow-scripts allow-same-origin"></iframe></div><div id="neowz-next-container"><a href="#"><img src="img/next.png"></a></div><div id="neowz-previous-container"><a href="#"><img src="img/prev.png"></a></div><div id="neowz-loading"></div>';
            $el.html(html);

            $('body').height(initialWinHeight);

            fixFrameHeight();
            fixTickerWidth();
            bindEvents();
        }

        function fixFrameHeight() {
          $el.find('#neowz-frame-container').height($(window).height() - 55);
        }

        function fixTickerWidth() {
          $el.find('#neowz-header #neowz-ticker').width($(window).width() - 52);
        }

        function bindEvents() {
            $(window).bind("resize", fixFrameHeight);
            $(window).bind("resize", fixTickerWidth);
            $el.find('#neowz-header .close a').bind('click', destroy);
            $el.find("#neowz-next-container a").bind('click', nextStory);
            $el.find("#neowz-previous-container a").bind('click', previousStory);
            $el.find("#neowz-frame").load(hideLoading);
            $el.find("#neowz-frame").load(function(){$(this).scrollTo(0,0);});

            $(document).keyup(function(e) { // keystrokes
                if (e.keyCode == 27) destroy(); // esc
                if (e.keyCode == 37) previousStory(); // left
                if (e.keyCode == 39) nextStory(); // right
            });
        }

        function initWithStories(storiez, element, options) {
            stories = storiez;
            for (var i in stories) {
                addStoryToTicker(stories[i]);
            }
            updateState();
        }

        function initWithRSS(rss, element, options) {
            var s = [];
            jQuery.getFeed({
                url: 'proxy.php?url=' + rss,
                success: function(feed) {
                    window.feed = feed;
                    for (var i in feed.items) {
                      var title = feed.items[i].title;
                      var link = (URI(feed.items[i].id).domain() !== '') ? 
                                    feed.items[i].id :
                                    feed.items[i].link;
                      var pubDate = feed.items[i].updated;
                      s.push({
                          title: title,
                          link: link,
                          pubDate: pubDate
                      });
                    }
                    initWithStories(s, element, options);
                }
            });
        }

        function updateState() {
            if (currentStoryIndex == undefined) currentStoryIndex = 0;
            if (currentStoryIndex == 0) {
                $el.find("#neowz-next-container").show();
                $el.find("#neowz-previous-container").hide();
            } else if (currentStoryIndex == stories.length - 1) {
                $el.find("#neowz-next-container").hide();
                $el.find("#neowz-previous-container").show();
            } else {
                $el.find("#neowz-next-container").show();
                $el.find("#neowz-previous-container").show();
            }

            $el.find("#neowz-ticker li").removeClass('current');
            $($el.find("#neowz-ticker li")[currentStoryIndex]).addClass('current');

            $el.find("#neowz-ticker").scrollTo('li:eq(' + currentStoryIndex + ')', 500, function() {
                try {
                    $el.find("#neowz-frame").attr('src', stories[currentStoryIndex].link);                    
                    document.title = stories[currentStoryIndex].title;
                } catch (e) {
                    console.log("Story does not have a link.");
                }
            });

            showLoading();
            fixTickerWidth();
            fixFrameHeight();
        }

        function nextStory() {
            if (currentStoryIndex < stories.length - 1) {
                currentStoryIndex += 1;
                updateState();
            }
            return false;
        }

        function previousStory() {
            if (currentStoryIndex > 0) {
                currentStoryIndex -= 1;
                updateState();
            }
            return false;
        }

        function jumpToStory(index) {
            currentStoryIndex = index;
            updateState();
            return false;
        }

        function showLoading() {
            var loading = $el.find("#neowz-loading");
            var top = $(window).height() / 2 - loading.height() / 2;
            var left = $(window).width() / 2 - loading.width() / 2;
            loading.css({
                top: top,
                left: left,
                display: 'block'
            });
        }

        function hideLoading() {
            $el.find("#neowz-loading").css({
                display: 'none'
            });
        }

        function addStoryToTicker(story) {
            var title = (story.title.length > 58) ? story.title.substr(0, 56) + '...' : story.title;
            title = '<a href="#">' + title + '</a>';
            var link = URI(story.link).domain();
            var favicon = "http://www.google.com/s2/u/0/favicons?domain=" + link;
            var timestamp = new Date(Date.parse(story.pubDate)).toISOString();//new Date.parse(story.pubDate).toISOString().replace(/\.000/g, "");

            var html = '<li><h4>' + title + '</h4><h4><img src="' + favicon + '">' + link + '</h4><span class="timeago" title="' + timestamp + '">' + timestamp + '</span></li>';
            var li = $(html);
            $el.find("#neowz-ticker ul").append(li);

            // bind ticker-specific events
            li.click(function() {
                if (currentStoryIndex !== $(this).index()) jumpToStory($(this).index())
            });
            li.find("span.timeago").timeago();
        }

        // --- Helper Functions (no side-effect) ---
        function isValidStories(stories) {
            //TODO: implement
            return true;
        }

        /**
         * Get/set a plugin option.
         * Get usage: $('#el').neowz('option', 'key');
         * Set usage: $('#el').neowz('option', 'key', value);
         */

        function option(key, val) {
            if (val) {
                options[key] = val;
            } else {
                return options[key];
            }
        }

        /**
         * Destroy plugin.
         * Usage: $('#el').neowz('destroy');
         */

        function destroy() {
            // Iterate over each matching element.
            $el.each(function() {
                var el = this;
                var $el = $(this);

                // Remove Plugin instance from the element.
                $el.removeData('plugin_' + pluginName);
                $el.parent().removeData('plugin_' + pluginName);

                // Add code to restore the element to its original state...
                $el.removeAttr('style').children().remove();
                $el.remove();
                $('body').height(initialBodyHeight);
                document.title = initialTitle;

                hook('onDestroy');
            });
        }

        /**
         * Callback hooks.
         * Usage: In the defaults object specify a callback function:
         * hookName: function() {}
         * Then somewhere in the plugin trigger the callback:
         * hook('hookName');
         */

        function hook(hookName) {
            if (options[hookName] !== undefined) {
                // Call the user defined function.
                // Scope is set to the jQuery element we are operating on.
                options[hookName].call(el);
            }
        }

        // Initialize the plugin instance.
        init();

        // Expose methods of Plugin we wish to be public.
        return {
            option: option,
            destroy: destroy
        };
    }

    /**
     * Plugin definition.
     */
    $.fn[pluginName] = function(options) {
        // If the first parameter is a string, treat this as a call to
        // a public method.
        if (typeof arguments[0] === 'string') {
            var methodName = arguments[0];
            var args = Array.prototype.slice.call(arguments, 1);
            var returnVal;
            this.each(function() {
                // Check that the element has a plugin instance, and that
                // the requested public method exists.
                if ($.data(this, 'plugin_' + pluginName) && typeof $.data(this, 'plugin_' + pluginName)[methodName] === 'function') {
                    // Call the method of the Plugin instance, and Pass it
                    // the supplied arguments.
                    returnVal = $.data(this, 'plugin_' + pluginName)[methodName].apply(this, args);
                } else {
                    throw new Error('Method ' + methodName + ' does not exist on jQuery.' + pluginName);
                }
            });
            if (returnVal !== undefined) {
                // If the method returned a value, return the value.
                return returnVal;
            } else {
                // Otherwise, returning 'this' preserves chainability.
                return this;
            }
            // If the first parameter is an object (options), or was omitted,
            // instantiate a new instance of the plugin.
        } else if (typeof options === "object" || !options) {
            return this.each(function() {
                // Only allow the plugin to be instantiated once.
                if (!$.data(this, 'plugin_' + pluginName)) {
                    // Pass options to Plugin constructor, and store Plugin
                    // instance in the elements jQuery data object.
                    $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
                }
            });
        }
    };

    // Default plugin options.
    // Options can be overwritten when initializing plugin, by
    // passing an object literal, or after initialization:
    // $('#el').neowz('option', 'key', value);
    $.fn[pluginName].defaults = {
        top: 0,
        left: 0,
        zIndex: 1000
    };

})(jQuery);