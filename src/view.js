angular.module('ajoslin.mobile-navigate')
.directive('mobileView', ['$rootScope', '$compile', '$controller', '$route', '$change', '$q',
function($rootScope, $compile, $controller, $route, $change, $q) {

  function link(scope, viewElement, attrs) {
    //Insert page into dom
    function insertPage(page) {
      var current = $route.current,
      locals = current && current.locals;

      page.element = angular.element(document.createElement("div"));
      page.element.html(locals.$template);
      page.element.addClass('mb-page'); //always has to have page class
      page.scope = scope.$new();
      if (current.controller) {
        locals.$scope = page.scope;
        page.controller = $controller(current.controller, locals);
        page.element.contents().data('$ngControllerController', page.controller);
      }
      $compile(page.element.contents())(page.scope);
      if (locals && locals.$template) {
        // only append page element if a template exists
        viewElement.append(page.element);
      }
      page.scope.$emit('$viewContentLoaded');
      page.scope.$eval(attrs.onLoad);
      return page;
    }

    var transitionListener = scope.$on('$pageTransitionStart', function ($event, dest, source, reverse) {
      var current = $route.current ? $route.current.$$route : {};
      var transition = reverse ? source.transition() : dest.transition();

      if (source && source.element) {
        var siblings = source.element.parent().children();
        for (var index = 0; index < siblings.length; index++) {
          if (source.element[0] !== siblings[index]) {
            angular.element(siblings[index]).remove();
          }
        }
      }

      insertPage(dest);

      //If the page is marked as reverse, reverse the direction
      if (dest.reverse() || current.reverse) {
        reverse = !reverse;
      }

      function doTransition() {

        var promise = $change(dest.element, (source ? source.element : null),
          transition, reverse);

        promise.then(function() {
          if (source) {
            $rootScope.$broadcast('$pageTransitionSuccess', dest, source);
            source.scope.$destroy();
            source.scope = undefined;
            source.element.remove();
            source.element = undefined;
            source = undefined;
            promise = null;
          }
        });

        return promise;
      }

      //Set next element to display: none, then wait until transition is
      //ready, then show it again.
      dest.element.css('display', 'none');

      //Allow a deferTransition expression, which is allowed to return a promise.
      //The next page will be inserted, but not transitioned in until the promise
      //is fulfilled.
      var deferTransitionPromise = scope.$eval(attrs.deferTransition) || $q.when();

      deferTransitionPromise.then(function() {
        //Undo display none from waiting for transition
        dest.element.css('display', '');
        deferTransitionPromise = null;
        return doTransition();
      });
    });

    scope.$on('$destroy', function(){
      transitionListener();
      element.remove();
    });
  }
  return {
    restrict: 'EA',
    link: link
  };
}])

.directive('scrollable', ['$route', function($route) {
  var scrollCache = {};
  return {
    restrict: 'EA',
    link: function(scope, elm, attrs) {
      var route = $route.current ? $route.current.$$route : {};
      var template = route.templateUrl || route.template;
      var rawElm = elm[0];

      //On scope creation, see if we remembered any scroll for this templateUrl
      //If we did, set it
      if (template) {
        //Set oldScroll after a timeout so the page has time to fully load
        setTimeout(function() {
          var oldScroll = scrollCache[template];
          if (oldScroll) {
            rawElm.scrollTop = oldScroll;
          }
        });

        scope.$on('$destroy', function() {
          scrollCache[template] = rawElm.scrollTop;
        });
      }
    }
  };
}]);
