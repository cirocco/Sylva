/* Adapted from https://github.com/versae/qbe */
if (!diagram) {
    var diagram = {};
}
diagram.Container = "diagram";
diagram.CurrentModels = [];

(function($) {
    /**
      * AJAX Setup for CSRF Django token
      */
    $.ajaxSetup({
         beforeSend: function(xhr, settings) {
             function getCookie(name) {
                 var cookieValue = null;
                 if (document.cookie && document.cookie != '') {
                     var cookies = document.cookie.split(';');
                     for (var i = 0; i < cookies.length; i++) {
                         var cookie = jQuery.trim(cookies[i]);
                         // Does this cookie string begin with the name we want?
                     if (cookie.substring(0, name.length + 1) == (name + '=')) {
                         cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                         break;
                     }
                 }
             }
             return cookieValue;
             }
             if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                 // Only send the token to relative URLs i.e. locally.
                 xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
             }
         } 
    });

    init = function() {
        diagram.Defaults = {};
        diagram.Defaults["foreign"] = {
            label: null,
            labelStyle: null,
            paintStyle: {
                strokeStyle: '#96D25C',
                lineWidth: 2
            },
            backgroundPaintStyle: {
                lineWidth: 4,
                strokeStyle: '#70A249'
            },
            makeOverlays: function() {
                return [
                    new jsPlumb.Overlays.PlainArrow({
                        foldback: 0,
                        fillStyle: '#96D25C',
                        strokeStyle: '#70A249',
                        location: 0.99,
                        width: 10,
                        length: 10})
                ];
            }
        };
        diagram.Defaults["many"] = {
            label: null,
            labelStyle: {
                fillStyle: "white",
                padding: 0.25,
                font: "12px sans-serif", 
                color: "#C55454",
                borderStyle: "#C55454", 
                borderWidth: 3
            },
            paintStyle: {
                strokeStyle: '#DB9292',
                lineWidth: 2
            },
            backgroundPaintStyle: {
                lineWidth: 4,
                strokeStyle: '#C55454'
            },
            makeOverlays: function() {
                return [
                    new jsPlumb.Overlays.PlainArrow({
                        foldback: 0,
                        fillStyle: '#DB9292',
                        strokeStyle: '#C55454',
                        location: 0.75,
                        width: 10,
                        length: 10}),
                    new jsPlumb.Overlays.PlainArrow({
                        foldback: 0,
                        fillStyle: '#DB9292',
                        strokeStyle: '#C55454',
                        location: 0.25,
                        width: 10,
                        length: 10})
                ];
            }
        }

        jsPlumb.Defaults.DragOptions = {cursor: 'pointer', zIndex: 2000};
        jsPlumb.Defaults.Container = diagram.Container;

        /**
         * Adds a new model box with its fields
         */
        diagram.addBox = function (graphName, modelName) {
            var model, root, divBox, divTitle, fieldName, field, divField, divFields, divManies, primaries, countFields, anchorDelete;
            primaries = [];
            model = diagram.Models[graphName][modelName];
            root = $("#"+ diagram.Container);
            divBox = $("<DIV>");
            divBox.attr("id", "diagramBox_"+ modelName);
            divBox.css({
                "left": (parseInt(Math.random() * 55 + 1) * 10) + "px",
                "top": (parseInt(Math.random() * 25 + 1) * 10) + "px"
            });
            divBox.on("mouseenter", function() {
                $(".content2-first").scrollTo("#model_"+ modelName, {
                    "duration": 500,
                    "queue": false
                });
            });
            divBox.addClass("body");
            divTitle = $("<DIV>");
            divTitle.addClass("title");
            diagram.setLabel(divTitle, model.name, false);
            anchorDelete = $("<A>");
            anchorDelete.html("x");
            anchorDelete.attr("href", "javascript:void(0);");
            anchorDelete.addClass("inline-deletelink");
            anchorDelete.click(function () {
                $("#diagramModelAnchor_"+ graphName +"\\\."+ modelName).click();
                divFields.toggleClass("hidden");
                anchorDelete.toggleClass("inline-morelink");
                anchorDelete.toggleClass("inline-deletelink");
                diagram.saveBoxPositions();
            });
            divTitle.append(anchorDelete);
            divFields = $("<DIV>");
            divFields.attr("id", "diagramFields_"+ modelName);
            countFields = 0;
            lengthFields = model.fields.length;
//            for(fieldName in model.fields) {
            for(var fieldIndex = 0; fieldIndex < lengthFields; fieldIndex++) {
                field = model.fields[fieldIndex];
                divField = $("<DIV>");
                divField.addClass("field");
                diagram.setLabel(divField, field.label, field.primary);
                divField.attr("id", "diagramBoxField_"+ graphName +"."+ modelName +"."+ fieldName);
                if (field.type == "ForeignKey") {
                    divField.addClass("foreign");
                    divField.click(diagram.addRelated);
                    divBox.prepend(divField);
                } else if (field.type == "ManyToManyField") {
                    divField.addClass("many");
                    divField.click(diagram.addRelated);
                    if (!divManies) {
                        divManies = $("<DIV>");
                    }
                    divManies.append(divField);
                } else if (field.primary) {
                    divField.addClass("primary");
                    primaries.push(divField);
                } else {
                    divFields.append(divField);
                    countFields++;
                }
            }
            if (countFields < 5 && countFields > 0) {
                divFields.addClass("noOverflow");
            } else if (countFields > 0) {
                divFields.addClass("fieldsContainer");
                /*
                // Uncomment to change the size of the div containing the regular
                // fields no mouse over/out
                divFields.mouseover(function() {
                    $(this).removeClass("fieldsContainer");
                });
                divFields.mouseout(function() {
                    $(this).addClass("fieldsContainer");
                });
                jsPlumb.repaint(["diagramBox_"+ modelName]);
                */
            }
            if (divManies) {
                divBox.append(divManies);
            }
            divBox.append(divFields);
            for(divField in primaries) {
                divBox.prepend(primaries[divField]);
            }
            divBox.prepend(divTitle);
            root.append(divBox);
            divBox.draggable({
                handle: ".title",
                grid: [10, 10],
                stop: function (event, ui) {
                    var $this, position, left, top;
                    $this = $(this);
                    position = $this.position()
                    left = position.left;
                    if (position.left < 0) {
                        left = "0px";
                    }
                    if (position.top < 0) {
                        top = "0px";
                    }
                    $this.animate({left: left, top: top}, "fast", function() {
                        jsPlumb.repaint(["diagramBox_"+ modelName]);
                    });
                    diagram.saveBoxPositions();
                }
            });
        };

        /**
         * Set the label fo the fields getting shorter and adding ellipsis
         */
        diagram.setLabel = function (div, label, primary) {
            div.html(label);
            if (label.length > 18) {
                if (primary) {
                    div.html(label.substr(0, 18) +"…");
                } else if (label.length > 21) {
                    div.html(label.substr(0, 21) +"…");
                }
                div.attr("title", label);
                div.attr("alt", label);
            }
        };

        /**
         * Adds a model to the layer
         */
        diagram.addModel = function (graphName, modelName) {
            var appModel, model, target1, target2;
            model = diagram.Models[graphName][modelName];
            appModel = graphName +"."+ modelName;
            if (diagram.CurrentModels.indexOf(appModel) < 0) {
                diagram.CurrentModels.push(appModel);
                if (model.is_auto) {
                    target1 = model.relations[0].target;
                    target2 = model.relations[1].target;
                    diagram.addModel(target1.name, target1.model);
                    diagram.addModel(target2.name, target2.model);
                } else {
                    diagram.addBox(graphName, modelName);
                }
                diagram.updateRelations();
            }
        };

        /*
         * Removes a model from the layer
         */
        diagram.removeModel = function(graphName, modelName) {
            var appModel = graphName +"."+ modelName;
            var pos = diagram.CurrentModels.indexOf(appModel);
            if (pos >= 0) {
                diagram.CurrentModels.splice(pos, 1);
                var model = diagram.Models[graphName][modelName];
                diagram.removeBox(graphName, modelName)
                diagram.removeRelations(graphName, modelName);
            }
        };

        /*
         * Update relations among models
         */
        diagram.updateRelations = function () {
            var label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlay;
            var relations, relation, mediumHeight, connections;
            var sourceAppModel, sourceModelName, sourceAppName, sourceModel, sourceFieldName, sourceId, sourceField, sourceSplits, divSource;
            var targetModel, targetAppName, targetModelName, targetFieldName, targetId, targetField, divTarget;
            for(var i=0; i<diagram.CurrentModels.length; i++) {
                sourceAppModel = diagram.CurrentModels[i];
                sourceSplits = sourceAppModel.split(".");
                sourceAppName = sourceSplits[0];
                sourceModelName = sourceSplits[1];
                sourceModel = diagram.Models[sourceAppName][sourceModelName];
                relations = sourceModel.relations;
                for(var j=0; j<relations.length; j++) {
                    relation = relations[j];
                    sourceFieldName = relation.source;
                    label = diagram.Defaults["foreign"].label;
                    labelStyle = diagram.Defaults["foreign"].labelStyle;
                    paintStyle = diagram.Defaults["foreign"].paintStyle;
                    makeOverlays = diagram.Defaults["foreign"].makeOverlays;
                    backgroundPaintStyle = diagram.Defaults["foreign"].backgroundPaintStyle;
                    if (relation.target.through) {
                        if (diagram.Models[relation.target.through.name][relation.target.through.model].is_auto) {
                            targetModel = relation.target;
                            label = relation.target.through.model;
                            labelStyle = diagram.Defaults["many"].labelStyle;
                            paintStyle = diagram.Defaults["many"].paintStyle;
                            makeOverlays = diagram.Defaults["many"].makeOverlays;
                            backgroundPaintStyle = diagram.Defaults["many"].backgroundPaintStyle;
                        } else {
                            targetModel = relation.target.through;
                        }
                    } else {
                        targetModel = relation.target;
                    }
                    targetAppName = targetModel.name;
                    targetModelName = targetModel.model;
                    targetFieldName = targetModel.field;
                    sourceField = $("#diagramBoxField_"+ sourceAppName +"\\."+ sourceModelName +"\\."+ sourceFieldName);
                    targetField = $("#diagramBoxField_"+ targetAppName +"\\."+ targetModelName +"\\."+ targetFieldName);
                    if (sourceField.length && targetField.length
                        && !diagram.hasConnection(sourceField, targetField)) {
                        sourceId = "diagramBox_"+ sourceModelName;
                        targetId = "diagramBox_"+ targetModelName;
                        divSource = document.getElementById(sourceId);
                        divTarget = document.getElementById(targetId);
                        if (divSource && divTarget) {
                            diagram.addRelation(sourceId, sourceField, targetId, targetField, label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlays());
                        }
                    }
                }
            }
        }

        /**
         * Create a relation between a element with id sourceId and targetId
         * - sourceId.
         * - sourceFieldName
         * - targetId.
         * - targetFieldName
         * - label.
         * - labelStyle.
         * - paintStyle.
         * - backgroundPaintStyle.
         * - overlays.
         */
        diagram.addRelation = function(sourceId, sourceField, targetId, targetField, label, labelStyle, paintStyle, backgroundPaintStyle, overlays) {
            var mediumHeight;
            mediumHeight = sourceField.css("height");
            mediumHeight = parseInt(mediumHeight.substr(0, mediumHeight.length - 2)) / 2;
            jsPlumb.connect({
                scope: "diagramBox",
                label: label,
                labelStyle: labelStyle,
                source: sourceId,
                target: targetId,
                endpoints: [
                    new jsPlumb.Endpoints.Dot({radius: 0}),
                    new jsPlumb.Endpoints.Dot({radius: 0})
                ],
                paintStyle: paintStyle,
                backgroundPaintStyle: backgroundPaintStyle,
                overlays: overlays,
                anchors: [
                    jsPlumb.makeDynamicAnchor([
                        jsPlumb.makeAnchor(1, 0, 1, 0, 0, sourceField.position().top + mediumHeight + 4),
                        jsPlumb.makeAnchor(0, 0, -1, 0, 0, sourceField.position().top + mediumHeight + 4)
                    ]),
                    jsPlumb.makeDynamicAnchor([
                        jsPlumb.makeAnchor(0, 0, -1, 0, 0, targetField.position().top + mediumHeight + 4),
                        jsPlumb.makeAnchor(1, 0, 1, 0, 0, targetField.position().top + mediumHeight + 4)
                    ])
                ]
            });
            diagram.CurrentRelations.push(sourceField.attr("id") +"~"+ targetField.attr("id"));
        }

       /**
         * Save the positions of the all the boxes in a serialized way into a
         * input type hidden
         */
        diagram.saveBoxPositions = function () {
            var positions, positionsString, left, top, splits, appModel, modelName;
            positions = [];
            for(var i=0; i<diagram.CurrentModels.length; i++) {
                appModel = diagram.CurrentModels[i];
                splits = appModel.split(".");
                modelName = splits[1];
                left = $("#diagramBox_"+ modelName).css("left");
                top = $("#diagramBox_"+ modelName).css("top");
                status = $("#diagramBox_"+ modelName +" > div > a").hasClass("inline-deletelink");
                positions.push({
                    modelName: modelName,
                    left: left,
                    top: top,
                    status: status
                });
            }
            positionsString = JSON.stringify(positions);
            $.ajax({
                url: $("#id_diagram_positions_url").val(),
                dataType: 'json',
                data: {diagram_positions: positionsString},
                type: 'post',
                success: function() {
                    // $("#id_diagram_positions").val(positionsString);
                }
            });
        };

        /**
         * Load the models from the schema
         */
        diagram.loadModels = function() {
            var graph, models, modelName, position, positions, titleAnchor;
            if (diagram.Models) {
                for(graph in diagram.Models) {
                    models = diagram.Models[graph];
                    for(modelName in models) {
                        diagram.addModel(graph, modelName);
                    }
                }
            }
            positions = JSON.parse($("#id_diagram_positions").val());
            for(var i=0; i<positions.length; i++) {
                position = positions[i]
                // Show just selected models
                // if (!(appModel in diagram.CurrentModels)) {
                //     $("#qbeModelItem_"+ modelName).toggleClass("selected");
                //     diagram.addModule(graphName, modelName);
                // }
                $("#diagramBox_"+ position.modelName).css({
                    left: position.left,
                    top: position.top
                });
                if (!JSON.parse(position.status)) {
                    titleAnchor = $("#diagramBox_"+ position.modelName +" > div > a");
                    titleAnchor.removeClass("inline-deletelink");
                    titleAnchor.addClass("inline-morelink");
                    $("#diagramFields_"+ position.modelName).toggleClass("hidden");
                }
            }
        }
        diagram.loadModels();
    };
    $(document).ready(init);
})(jQuery);