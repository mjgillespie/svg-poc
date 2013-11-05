(function () {
  angular.module('svgAbstraction.directives')
    .directive('ngSvgDraggable', function ($compile) {
      return {
        restrict: 'A',
        require: '^ngSvg',
        link: function ($scope, element, attr, ngSvgController) {
          var ngSvg = ngSvgController;

          $scope.$watch(attr.ngSvgDraggable, function (isDraggable) {
            if (isDraggable) {
              element.draggable(options);
            }
          });

          var orig,
            options = {
              start: function (event) {
                var parentGroup = this;

                var pt = parentGroup.ownerSVGElement.createSVGPoint();
                pt.x = event.pageX;
                pt.y = event.pageY;

                var matrix = parentGroup.getScreenCTM().inverse();
                pt = pt.matrixTransform(matrix);

                orig = {x: pt.x, y: pt.y};

                if($scope.viewModel.showPreviewImage){
                  orig.x = orig.x - $scope.viewModel.model.image.left;
                  orig.y = orig.y - $scope.viewModel.model.image.top;
                }
              },
              drag: function (event, ui) {
                var parentGroup = this;
                var delta = getTranslatedDragDeltas(parentGroup, event);

                $scope.$apply(function () {
                  $scope.viewModel.isDragging = true;

                  if($scope.viewModel.showPreviewImage){
                    $scope.viewModel.model.image.left = delta.x;
                    $scope.viewModel.model.image.top = delta.y;
                  } else {
                    var adjustment = adjustTranslate(parentGroup, delta.x, delta.y, true);
                    $scope.viewModel.model.left = adjustment.x;
                    $scope.viewModel.model.top = adjustment.y;
                  }

                });
              },
              stop: function () {
                $scope.$apply(function () {
                  $scope.viewModel.isDragging = false;
                });
              }
            };

          // convert screen to element coordinates
          function getTranslatedDragDeltas(draggedElement, event) {
            var pt = draggedElement.ownerSVGElement.createSVGPoint();
            pt.x = event.pageX;
            pt.y = event.pageY;

            var matrix = draggedElement.getScreenCTM().inverse();
            pt = pt.matrixTransform(matrix);
            var deltax = pt.x - orig.x;
            var deltay = pt.y - orig.y;

            var pt2 = draggedElement.ownerSVGElement.createSVGPoint();
            pt2.x = deltax;
            pt2.y = deltay;
            pt2 = pt2.matrixTransform(draggedElement.getCTM());

            var pt3 = draggedElement.ownerSVGElement.createSVGPoint();
            pt3.x = 0;
            pt3.y = 0;
            pt3 = pt3.matrixTransform(draggedElement.getCTM());

            deltax = pt2.x - pt3.x;
            deltay = pt2.y - pt3.y;

            return {
              x: deltax,
              y: deltay
            };
          }

          function adjustTranslate(elt, x, y, isRelative) {
            if (!elt.transform.baseVal.numberOfItems) {
              return;
            }

            // make sure transform 1 is a translate transform
            var trans = elt.transform.baseVal.getItem(0);
            if (trans.type !== 2) {
              return;
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
      };
    });
})();