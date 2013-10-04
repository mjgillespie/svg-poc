(function () {
  // wrap jquery svg draw methods which produce errors with angular
  angular.module('svgAbstraction.directives')
    .directive('ngShape', function ($compile, $timeout, pathService, textReflowService) {
      return {
        restrict: 'E',
        require: '^ngSvg',
        scope: {
          viewModel: '=',
          draggable: '=',
          whenClick: '&',
          whenDoubleClicked: '&'
        },
        link: function ($scope, element, attr, ngSvgController) {
          var ngSvg = ngSvgController;

          var pathDefinition = createPathDefinition($scope, ngSvg);
          var parentGroup = drawShape($scope, ngSvg);

          $compile(pathDefinition)($scope);
          $compile(parentGroup)($scope);

          $scope.viewModel.svgElementPath = pathDefinition;
          $scope.viewModel.svgElement = parentGroup;

          // attach svg element to dom element so we can access it from other directives
          element.data('parentGroup', parentGroup);

          $scope.$watch('viewModel.model.image.url', function (url, oldVal) {
            if (url === oldVal) {
              return;
            }

            calculateImageHeightWidth($scope);
          });

          $scope.$on("$destroy", function () {
            ngSvg.svg.remove(pathDefinition);
            ngSvg.svg.remove(parentGroup);
          });


          // DEBUG
          window.debugTriggerTextReflow = function () {
            var text = $(parentGroup).find('.text')[0];
//            var container = $(parentGroup).find('.shape')[0];

            textReflowService.recalcText(text, parentGroup, ngSvg.svg);
          }
        }
      };

      function createPathDefinition($scope, ngSvg) {
        var id = $scope.viewModel.makeUrlRef('clipPath');
        var clipPathParent = ngSvg.svg.clipPath(ngSvg.paths, id);

        var path = ngSvg.svg.path(clipPathParent, '', {
          'id': '{{viewModel.model.id}}',

          // stroke width is needed on the def so other calculations work correctly
          'stroke-width': '{{viewModel.model.borderWidth}}',

          // not sure why "d" is the only one that needs ng-attr
          // jquery.svg throws error without "ng-attr"
          'ng-attr-d': '{{viewModel.model.path}}'
        });

        return path;
      }

      function drawShape($scope, ngSvg) {
        var transform = [
          'translate({{viewModel.model.left}},{{viewModel.model.top}})',
          'rotate({{viewModel.model.rotation}},{{viewModel.midPointX()}},{{viewModel.midPointY()}})'
        ];

        var parentGroup = ngSvg.svg.group(ngSvg.shapeGroup, {
          transform: transform.join(', ')
        });

        var shapeBackground = ngSvg.svg.use(parentGroup, '', {
          'ng-href': '{{"#" + viewModel.model.id}}',
          'class': 'shape',
          'fill': '{{viewModel.model.backgroundColor}}',
          'ng-mousedown': 'whenClick()',
          'ng-dblclick': 'whenDoubleClicked()'
        });

        drawImage($scope, ngSvg, parentGroup);

        var shapeForeground = ngSvg.svg.use(parentGroup, '', {
          'ng-href': '{{ "#" + viewModel.model.id}}',
          'class': 'shape',
          'fill': 'none',
          'stroke': '{{viewModel.model.borderColor}}',
          'stroke-width': '{{viewModel.model.borderWidth}}',
          'ng-mousedown': 'whenClick()',
          'ng-dblclick': 'whenDoubleClicked()'
        });

        var textSpans = ngSvg.svg.createText().string('{{viewModel.model.text}}');

        ngSvg.svg.text(parentGroup, 10, 10, textSpans, {
          class: 'text',
          opacity: 1,
          'font-family': '{{viewModel.model.font}}',
          'font-size': '{{viewModel.model.fontSize}}',
          fill: '{{viewModel.model.fontColor}}'
        });

        return parentGroup;
      }

      function drawImage($scope, ngSvg, parentGroup) {
        var imageBindings = {
          'ng-attr-x': '{{viewModel.imageLeft()}}',
          'ng-attr-y': '{{viewModel.imageTop()}}',
          'ng-attr-width': '{{viewModel.imageWidth()}}',
          'ng-attr-height': '{{viewModel.imageHeight()}}',
          'preserveAspectRatio': 'none'
        };

        var previewImageMaskId = $scope.viewModel.makeUrlRef('previewImageMask');

        var previewImageMask = ngSvg.svg.mask(parentGroup, previewImageMaskId, 0, 0, 0, 0, imageBindings);

        var previewImageMaskRect = ngSvg.svg.rect(previewImageMask, 0, 0, 0, 0, _.extend({
          'fill': 'white',
          'opacity': '.4'
        }, imageBindings));

        var imageTransform = [
          'rotate(',
          '{{viewModel.model.image.rotation}},',
          '{{viewModel.imageMidPointX() + viewModel.imageLeft()}},',
          '{{viewModel.imageMidPointY() + viewModel.imageTop()}}',
          ')'
        ];

        var imageGroup = ngSvg.svg.group(parentGroup, {
          'clip-path': 'url({{viewModel.urlRef("clipPath")}})'
        });

        var previewImage = ngSvg.svg.image(parentGroup, 0, 0, 0, 0, '', _.extend({
          'ng-href': '{{ viewModel.model.image.url }}',
          'ng-attr-mask': 'url({{viewModel.urlRef("previewImageMask")}})',
          'transform': imageTransform.join(''),
          'ng-show': 'viewModel.showPreviewImage'
        }, imageBindings));

        var image = ngSvg.svg.image(imageGroup, 0, 0, 0, 0, '', _.extend({
          'ng-href': '{{ viewModel.model.image.url }}',
          'ng-mousedown': 'whenClick()',
          'ng-dblclick': 'whenDoubleClicked()',
          'transform': imageTransform.join(''),
          'ng-show': 'viewModel.model.image.url'
        }, imageBindings));
      }

      function calculateImageHeightWidth($scope) {
        // if drawing image, calculate path
        if (!$scope.viewModel.model.image.url) {
          return;
        }

        var width,
          height,
          img = new Image();
//          viewModelImage = $scope.viewModel.model.image;

        img.onload = function () {
          width = this.width;
          height = this.height;

          $scope.$apply(function () {
            $scope.viewModel.model.image.width = width;
            $scope.viewModel.model.image.height = height;
          });
        };

        img.src = $scope.viewModel.model.image.url;
      }

      function setShapeWidthHeight($scope, shape) {
        // shape needs to be rendered before we can calculate its midpoint
        $timeout(function () {
          var selectionBox = pathService.getSelectionBox(shape);
          $scope.viewModel.width = selectionBox.width;
          $scope.viewModel.height = selectionBox.height;
        });
      }
    });
})();