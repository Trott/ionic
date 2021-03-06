(function() {
'use strict';

/**
 * @description
 * The NavController is a navigation stack View Controller modelled off of 
 * UINavigationController from Cocoa Touch. With the Nav Controller, you can
 * "push" new "pages" on to the navigation stack, and then pop them off to go
 * back. The NavController controls a navigation bar with a back button and title
 * which updates as the pages switch.
 *
 * The NavController makes sure to not recycle scopes of old pages
 * so that a pop will still show the same state that the user left.
 *
 * However, once a page is popped, its scope is destroyed and will have to be
 * recreated then next time it is pushed.
 *
 */

var actualLocation = null;

angular.module('ionic.ui.navRouter', ['ionic.service.gesture'])

.run(['$rootScope', function($rootScope) {
  $rootScope.stackCursorPosition = 0;
}])

.directive('navRouter', ['$rootScope', '$timeout', '$location', '$window', '$route', function($rootScope, $timeout, $location, $window, $route) {
  return {
    restrict: 'AC',
    // So you can require being under this
    controller: ['$scope', '$element', function($scope, $element) {
      this.navBar = {
        isVisible: true
      };
      $scope.navController = this;
    }],

    link: function($scope, $element, $attr) {
      $scope.animation = $attr.animation;

      $element.addClass('noop-animation');

      var isFirst = true;

      var initTransition = function() {
        //$element.addClass($scope.animation);
      };

      var reverseTransition = function() {
        $element.removeClass('noop-animation');
        $element.addClass($scope.animation);
        $element.addClass('reverse');
      };

      var forwardTransition = function() {
        $element.removeClass('noop-animation');
        $element.removeClass('reverse');
        $element.addClass($scope.animation);
      };

      $scope.$on('$routeChangeSuccess', function(e, a) {
      });
      $scope.$on('$routeChangeStart', function(e, next, current) {
        var back, historyState = $window.history.state;

        back = !!(historyState && historyState.position <= $rootScope.stackCursorPosition);

        if(isFirst || (next && next.$$route.originalPath === "")) {
          // Don't animate
          return;
        }

        if(back) {
          reverseTransition();
        } else {
          forwardTransition();
        }
      });

      $scope.$on('$locationChangeSuccess', function(a, b, c) {
        // Store the new location
        $rootScope.actualLocation = $location.path();
        if(isFirst && $location.path() !== '/') {
          isFirst = false;
        }
      });  


      // Keep track of location changes and update a stack pointer that tracks whether we are
      // going forwards or back
      $scope.$watch(function () { return $location.path() }, function (newLocation, oldLocation) {
        if($rootScope.actualLocation === newLocation) {

          if(oldLocation == '' && newLocation == '/') {
            // initial route, skip this
            return;
          }

          var back, historyState = $window.history.state;

          back = !!(historyState && historyState.position <= $rootScope.stackCursorPosition);

          if (back) {
            //back button
            $rootScope.stackCursorPosition--;
          } else {
            //forward button
            $rootScope.stackCursorPosition++;
          }

        } else {
          var currentRouteBeforeChange = $route.current;

          if (currentRouteBeforeChange) {

            $window.history.replaceState({
              position: $rootScope.stackCursorPosition
            });

            $rootScope.stackCursorPosition++;
          }
        }
      });
    }
  }
}])

/**
 * Our Nav Bar directive which updates as the controller state changes.
 */
.directive('navBar', ['$rootScope', '$animate', '$compile', function($rootScope, $animate, $compile) {

  /**
   * Perform an animation between one tab bar state and the next.
   * Right now this just animates the titles.
   */
  var animate = function($scope, $element, oldTitle, data, cb) {
    var title, nTitle, oTitle, titles = $element[0].querySelectorAll('.title');

    var newTitle = data.title;
    if(!oldTitle || oldTitle === newTitle) {
      cb();
      return;
    }

    // Clone the old title and add a new one so we can show two animating in and out
    title = angular.element(titles[0]);
    oTitle = $compile('<h1 class="title" ng-bind="oldTitle"></h1>')($scope);
    title.replaceWith(oTitle);
    nTitle = $compile('<h1 class="title" ng-bind="currentTitle"></h1>')($scope);

    var insert = $element[0].firstElementChild || null;

    // Insert the new title
    $animate.enter(nTitle, $element, insert && angular.element(insert), function() {
      cb();
    });

    // Remove the old title
    $animate.leave(angular.element(oTitle), function() {
    });
  };

  return {
    restrict: 'E',
    require: '^navRouter',
    replace: true,
    scope: {
      type: '@',
      backButtonType: '@',
      backButtonLabel: '@',
      backButtonIcon: '@',
      alignTitle: '@',
    },
    template: '<header class="bar bar-header nav-bar" ng-class="{hidden: !navController.navBar.isVisible}">' + 
        '<div class="buttons"> ' +
          '<button nav-back class="button" ng-if="enableBackButton && showBackButton" ng-class="backButtonType" ng-bind-html="backButtonContent"></button>' +
          '<button ng-click="button.tap($event)" ng-repeat="button in leftButtons" class="button {{button.type}}" ng-bind="button.text"></button>' + 
        '</div>' +
        '<h1 class="title" ng-bind="currentTitle"></h1>' + 
        '<div class="buttons"> ' +
          '<button ng-click="button.tap($event)" ng-repeat="button in rightButtons" class="button {{button.type}}" ng-bind="button.text"></button>' + 
        '</div>' +
      '</header>',
    link: function($scope, $element, $attr, navCtrl) {
      var backButton;

      $element.addClass($attr.animation);

      // Create the back button content and show/hide it based on scope settings
      $scope.enableBackButton = true;
      $scope.backButtonContent = '';
      if($scope.backButtonIcon) {
        $scope.backButtonContent += '<i class="icon ' + $scope.backButtonIcon + '"></i>';
      }
      if($scope.backButtonLabel) {
        $scope.backButtonContent += ' ' + $scope.backButtonLabel
      }

      // Listen for changes in the stack cursor position to indicate whether a back
      // button should be shown (this can still be disabled by the $scope.enableBackButton
      $rootScope.$watch('stackCursorPosition', function(value) {
        if(value > 0) {
          $scope.showBackButton = true;
        } else {
          $scope.showBackButton = false;
        }
      });

      // Store a reference to our nav controller
      $scope.navController = navCtrl;

      // Initialize our header bar view which will handle resizing and aligning our title labels
      var hb = new ionic.views.HeaderBar({
        el: $element[0],
        alignTitle: $scope.alignTitle || 'center'
      });
      $scope.headerBarView = hb;

      // Add the type of header bar class to this element
      $element.addClass($scope.type);

      var updateHeaderData = function(data) {
        console.log('Header data changed', data);

        var oldTitle = $scope.currentTitle;
        $scope.oldTitle = oldTitle;

        if(typeof data.title !== 'undefined') {
          $scope.currentTitle = data.title;
        }

        $scope.leftButtons = data.leftButtons;
        $scope.rightButtons = data.rightButtons;

        if(typeof data.hideBackButton !== 'undefined') {
          $scope.enableBackButton = data.hideBackButton !== true;
        }

        if(data.animate !== false && typeof data.title !== 'undefined') {
          animate($scope, $element, oldTitle, data, function() {
            hb.align();
          });
        } else {
          hb.align();
        }
      };

      // Listen for changes on title change, and update the title
      $scope.$parent.$on('navRouter.pageChanged', function(e, data) {
        updateHeaderData(data);
      });

      $scope.$parent.$on('navRouter.pageShown', function(e, data) {
        updateHeaderData(data);
      });

      $scope.$parent.$on('navRouter.titleChanged', function(e, data) {
        var oldTitle = $scope.currentTitle;
        $scope.oldTitle = oldTitle;

         if(typeof data.title !== 'undefined') {
          $scope.currentTitle = data.title;
        }

        if(data.animate !== false && typeof data.title !== 'undefined') {
          animate($scope, $element, oldTitle, data, function() {
            hb.align();
          });
        } else {
          hb.align();
        }
      });


      /*
      $scope.$parent.$on('navigation.push', function() {
        backButton = angular.element($element[0].querySelector('.button'));
        backButton.addClass($scope.backButtonType);
        hb.align();
      });
      $scope.$parent.$on('navigation.pop', function() {
        hb.align();
      });
      */

      $scope.$on('$destroy', function() {
        //
      });
    }
  };
}])

.directive('navPage', ['$parse', function($parse) {
  return {
    restrict: 'E',
    scope: true,
    require: '^navRouter',
    link: function($scope, $element, $attr, navCtrl) {
      $element.addClass('pane');

      $scope.icon = $attr.icon;
      $scope.iconOn = $attr.iconOn;
      $scope.iconOff = $attr.iconOff;

      // Should we hide a back button when this tab is shown
      $scope.hideBackButton = $scope.$eval($attr.hideBackButton);

      // Whether we should animate on tab change, also impacts whether we
      // tell any parent nav controller to animate
      $scope.animate = $scope.$eval($attr.animate);

      // Grab whether we should update any parent nav router on tab changes
      $scope.doesUpdateNavRouter = $scope.$eval($attr.doesUpdateNavRouter) || true;

      // watch for changes in the left buttons
      var leftButtonsGet = $parse($attr.leftButtons);
      $scope.$watch(leftButtonsGet, function(value) {
        $scope.leftButtons = value;
        if($scope.doesUpdateNavRouter) {
          $scope.$emit('navRouter.leftButtonsChanged', $scope.rightButtons);
        }
      });

      // watch for changes in the right buttons
      var rightButtonsGet = $parse($attr.rightButtons);
      $scope.$watch(rightButtonsGet, function(value) {
        $scope.rightButtons = value;
      });

      // watch for changes in the title
      var titleGet = $parse($attr.title);
      $scope.$watch(titleGet, function(value) {
        $scope.title = value;
        $scope.$emit('navRouter.titleChanged', {
          title: value,
          animate: $scope.animate
        });
      });

    }
  }
}])

.directive('navBack', ['$window', '$rootScope', 'Gesture', function($window, $rootScope, Gesture) {
  return {
    restrict: 'AC',
    require: '^?navRouter',
    link: function($scope, $element, $attr, navCtrl) {
      var goBack = function(e) {
        // Only trigger back if the stack is greater than zero
        if($rootScope.stackCursorPosition > 0) {
          $window.history.back();
        }
      };
      var tapGesture = Gesture.on('tap', goBack, $element);
      $element.bind('click', goBack);

      $scope.$on('$destroy', function() {
        Gesture.off(tapGesture, 'tap', goBack);
        $element.unbind('click', goBack);
      });
    }
  }
}]);

})();
