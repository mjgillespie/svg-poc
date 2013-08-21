(function () {
  var rotatorLineLength = 20;

  angular.module('svgAbstraction.directives')
    .directive('selectionBox', function ($compile, pathService) {
      return {
        restrict: 'E',
        require: '^ngSvg',
        scope: {
          shape: '='
        },
        link: function ($scope, element, attr, ngSvgController) {
          $scope.width = 0;
          $scope.height = 0;

          var ngSvg = ngSvgController,
            selection = createSelectionBox(ngSvg);

          attachResizeBindings(selection.corners, $scope, ngSvg.svg);
          attachRotateBindings(selection.rotator, $scope, ngSvg.svg);

          $compile(selection.box)($scope);
          addScopeMethods($scope);
        }
      };

      function addScopeMethods($scope) {
        $scope.calcLeft = function (shape) {
          return shape ? shape.model.left - shape.model.borderWidth / 2 : 0;
//          return shape ? shape.model.left : 0;

        };

        $scope.calcTop = function (shape) {
          return shape ? shape.model.top - shape.model.borderWidth / 2 : 0;
//          return shape ? shape.model.top : 0;
        };

        $scope.calcMidPointX = function (shape) {
          return shape ? shape.midPointX + shape.model.borderWidth / 2 : 0;
//          return shape ? shape.midPointX : 0;

        };

        $scope.calcMidPointY = function (shape) {
          return shape ? shape.midPointY + shape.model.borderWidth / 2 : 0;
//          return shape ? shape.midPointY : 0;
        };

        $scope.$watch('shape', function (shape) {
          if (!shape) {
            return;
          }

          if (!shape.width || !shape.height) {
            var selectionBox = pathService.getSelectionBox(shape.svgElementPath);
            shape.width = selectionBox.width;
            shape.height = selectionBox.height;
          }

//          var selectionBox = pathService.getSelectionBox(shape.svgElementPath);
          $scope.width = shape.width;
          $scope.height = shape.height;
        });
      }

      function createSelectionBox(ngSvg) {
        var selectionBox = drawSelectionBox(ngSvg);
        var handles = drawSelectionCorners(ngSvg.svg, selectionBox);

        return {
          box: selectionBox,
          corners: handles.corners,
          rotator: handles.rotator
        };
      }

      function drawSelectionBox(ngSvg) {
        var transform = [
          'translate({{calcLeft(shape)}},{{calcTop(shape)}})',
          'rotate({{shape.model.rotation}},{{calcMidPointX(shape)}},{{calcMidPointY(shape)}})'
        ];

        var selectionBox = ngSvg.svg.group(ngSvg.selectionGroup, {
          transform: transform.join(', '),
          'ng-show': 'shape'
        });

        ngSvg.svg.path(selectionBox, '', {
          'ng-attr-d': 'M0,0L{{width}},0L{{width}},{{height}}L0,{{height}}z',
          fill: 'none',
          fillOpacity: '0.3',
          'stroke-dasharray': '5,5',
          stroke: '#0096fd',
          strokeWidth: 2
        });
        return selectionBox;
      }

      function drawSelectionCorners(svg, selectionBox) {
        var defaultCircleSettings = {
          class_: 'corner',
          fill: '#0096fd',
          'stroke-width': 1,
          stroke: 'white'
        };

        var cornerNW = svg.circle(selectionBox, 0, 0, 5, _.extend(defaultCircleSettings, {
          id: 'cornerNW',
          transform: 'translate(0,0)'
        }));

        var cornerNE = svg.circle(selectionBox, 0, 0, 5, _.extend(defaultCircleSettings, {
          id: 'cornerNE',
          transform: 'translate({{width}},0)'
        }));

        var cornerSE = svg.circle(selectionBox, 0, 0, 5, _.extend(defaultCircleSettings, {
          id: 'cornerSE',
          transform: 'translate({{width}},{{height}})'
        }));

        var cornerSW = svg.circle(selectionBox, 0, 0, 5, _.extend(defaultCircleSettings, {
          id: 'cornerSW',
          transform: 'translate(0,{{height}})'
        }));

        svg.line(selectionBox, 0, 0, 0, (-1 * rotatorLineLength), {
          id: 'rotatorLine',
          stroke: '#0096fd',
          strokeWidth: 3,
          transform: 'translate({{calcMidPointX(shape)}},0)'
        });

        var rotator = svg.circle(selectionBox, 0, 0, 5, _.extend(defaultCircleSettings, {
          id: 'rotator',
          class_: 'rotator',
          fill: '#FFFFFF',
          stroke: '#0096fd',
          strokeWidth: 1,
          transform: 'translate({{calcMidPointX(shape)}},-20)'
        }));

        return {
          corners: angular.element([cornerNW, cornerNE, cornerSE, cornerSW]),
          rotator: angular.element(rotator)
        };
      }

      function attachRotateBindings(rotator, $scope, svg) {
        rotator.draggable({
          drag: function (event, ui) {

            var angle = $scope.shape.model.rotation,
              parentGroup = rotator.parent()[0];

            var pt = convertScreenToElementCoordinates(parentGroup, event, svg);

            // ref point is height/2, -20
            var cx = $scope.width / 2;
            var cy = $scope.height / 2;

            var newAngle = getAngle({x: pt.x, y: pt.y},
              {x: cx, y: -20},
              {x: cx, y: cy});

            angle = (angle + newAngle) % 360;

            if (!event.shiftKey) {
              angle = Math.floor(angle / 15) * 15;
            }

            $scope.$apply(function () {
              $scope.shape.isResizing = true;
              $scope.shape.model.rotation = angle;
            });
          },
          stop: function () {
            $scope.$apply(function () {
              $scope.shape.isResizing = false;
            });
          }
        });
      }

      function convertScreenToElementCoordinates(selectionBoxGroup, event, svg) {
        var matrix = selectionBoxGroup.getScreenCTM().inverse();

        // convert screen to element coordinates
        var pt = svg._svg.createSVGPoint();
        pt.x = event.pageX;
        pt.y = event.pageY;
        pt = pt.matrixTransform(matrix);
        return pt;
      }

      function getAngle(ptA, ptB, ptC) {
        var a = dist(ptB, ptC);
        var b = dist(ptA, ptC);
        var c = dist(ptA, ptB);
        var radians = getAngleABC(a, b, c);
        var degrees = 57.2957795 * radians;

        if (ptA.x < ptB.x) {
          degrees = -degrees;
        }
        return degrees;
      }

      function getAngleABC(a, b, c) {
        var t = (a * a + b * b - c * c) / (2 * a * b);
        return Math.acos(t);
      }

      function dist(pt1, pt2) {
        return Math.sqrt(Math.pow(pt1.x - pt2.x, 2.0) + Math.pow(pt1.y - pt2.y, 2.0));
      }

      function attachResizeBindings(selectionCorners, $scope, svg) {
        selectionCorners.draggable({
          start: function () {
//            self.resizeStarted();
          },
          drag: function (event, ui) {

            var draggedCorner = $(this);
            var rawElement = $scope.shape.svgElement;
            var selectionBoxGroup = draggedCorner.parent()[0];
            var baselineOrigin = convertBaselineToSVG(selectionBoxGroup);
            var newDim = getNewShapeLocationAndDimensions(draggedCorner, event, $scope);

            $scope.$apply(function () {
              $scope.shape.midPointX = (newDim.width - $scope.shape.model.borderWidth) / 2;
              $scope.shape.midPointY = (newDim.height - $scope.shape.model.borderWidth) / 2;
            });

            var conversion = convertDeltasToSVG(selectionBoxGroup, baselineOrigin, newDim.deltaX, newDim.deltaY);
            var translation = getTranslation(rawElement, conversion.deltaX, conversion.deltaY, true);
            var scaleX = (newDim.width - $scope.shape.model.borderWidth) / ($scope.width - $scope.shape.model.borderWidth);
            var scaleY = (newDim.height - $scope.shape.model.borderWidth) / ($scope.height - $scope.shape.model.borderWidth);
            var shapePath = $scope.shape.svgElementPath;
            var newShapePath = rescaleElement(shapePath, scaleX, scaleY);

            $scope.$apply(function () {
              $scope.shape.isResizing = true;

              $scope.width = newDim.width;
              $scope.height = newDim.height;

              $scope.shape.model.top = translation.y;
              $scope.shape.model.left = translation.x;
              $scope.shape.width = newDim.width;
              $scope.shape.height = newDim.height;
              $scope.shape.model.path = newShapePath;
            });
          },
          stop: function () {
            $scope.$apply(function () {
              $scope.shape.isResizing = false;
          });
          }
        });

        function getNewShapeLocationAndDimensions(draggedCorner, event, $scope) {
          var selectionBoxGroup = draggedCorner.parent()[0];
          var pt = convertScreenToElementCoordinates(selectionBoxGroup, event, svg);
          var cornerId = draggedCorner.attr('id'),
            deltaX = 0,
            deltaY = 0,
            width = $scope.width,
            height = $scope.height;

          if (cornerId == 'cornerNW') {
            deltaX = -pt.x;
            deltaY = -pt.y;
            width = width - pt.x;
            height = height - pt.y;
          } else if (cornerId == 'cornerNE') {
            deltaY = -pt.y;
            width = pt.x;
            height = height - pt.y;
          } else if (cornerId == 'cornerSE') {
            width = pt.x;
            height = pt.y;
          } else if (cornerId == 'cornerSW') {
            deltaX = -pt.x;
            width = width - pt.x;
            height = pt.y;
          }

          return {
            deltaX: deltaX,
            deltaY: deltaY,
            width: width,
            height: height
          }
        }

        function convertBaselineToSVG(selectionBoxGroup) {
          var ptA = svg._svg.createSVGPoint();
          ptA.x = 0;
          ptA.y = 0;

          var ptB = ptA.matrixTransform(selectionBoxGroup.getCTM());

          return {
            x: ptB.x,
            y: ptB.y
          };
        }

        function convertDeltasToSVG(selectionBoxGroup, baselineOrigin, deltaX, deltaY) {

          var pt2 = svg._svg.createSVGPoint();
          pt2.x = deltaX;
          pt2.y = deltaY;
          pt2 = pt2.matrixTransform(selectionBoxGroup.getCTM());

          deltaX = baselineOrigin.x - pt2.x;
          deltaY = baselineOrigin.y - pt2.y;


          return {
            deltaX: deltaX,
            deltaY: deltaY
          };
        }

        function rescaleElement(element, scaleX, scaleY) {
          return pathService.transformShape(svg, element, scaleX, scaleY, 0, 0);
        }

        function getTranslation(elt, x, y, isRelative) {
          if (!elt.transform.baseVal.numberOfItems) {
            return;
          }

          // make sure transform 1 is a translate transform
          var trans = elt.transform.baseVal.getItem(0);
          if (trans.type !== 2) {
            return { };
          }

          if (isRelative) {
            var origX = trans.matrix.e;
            var origY = trans.matrix.f;

            x += origX;
            y += origY;
          }

          return {
            x: x,
            y: y
          };
        }
      }
    });
})();