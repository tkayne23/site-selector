/*global define,dojo,dojoConfig,esri,esriConfig,alert,handle:true,dijit,appGlobals */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/** @license
 | Copyright 2013 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/topic",
    "dojo/_base/html",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/dom-class",
    "dojo/_base/Color",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/tasks/GeometryService",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/graphic",
    "esri/tasks/BufferParameters",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "../siteLocator/unifiedSearch"

], function (declare, domConstruct, on, topic, html, lang, domStyle, domAttr, query, domClass, Color, Query, QueryTask, GeometryService, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, HorizontalSlider, HorizontalRule, unifiedSearch) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, unifiedSearch], {
        sliderDistance: null,
        selectedValue: null,
        areaSortBuilding: null,
        areaSortSites: null,
        lastGeometry: [null, null, null, null],
        arrGeoenrichData: [null, null, null, null],
        isIndexShared: false,
        _sliderCollection: [],

        /**
        * create horizontal slider for all tab and set minimum maximum value of slider
        * @param container node, horizontal rule node and slider value
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _createHorizontalSlider: function (sliderContainer, horizontalRuleContainer, divSliderValue, tabCount, bufferDistance) {
            var _self, horizontalSlider, sliderId, horizontalRule, sliderInstance = {};
            sliderId = "slider" + domAttr.get(sliderContainer, "data-dojo-attach-point");
            horizontalRule = new HorizontalRule({
                "class": "horizontalRule"
            }, horizontalRuleContainer);
            horizontalRule.domNode.firstChild.style.border = "none";
            horizontalRule.domNode.lastChild.style.border = "none";
            horizontalRule.domNode.lastChild.style.right = "0" + "px";
            if (!bufferDistance) {
                if (appGlobals.configData.DistanceUnitSettings.MinimumValue >= 0) {
                    bufferDistance = appGlobals.configData.DistanceUnitSettings.MinimumValue;
                } else {
                    bufferDistance = 0;
                    appGlobals.configData.DistanceUnitSettings.MinimumValue = bufferDistance;
                }
            }
            horizontalSlider = new HorizontalSlider({
                intermediateChanges: false,
                "class": "horizontalSlider",
                minimum: appGlobals.configData.DistanceUnitSettings.MinimumValue,
                maximum: appGlobals.configData.DistanceUnitSettings.MaximumValue,
                value: bufferDistance,
                id: sliderId
            }, sliderContainer);
            sliderInstance.id = tabCount;
            sliderInstance.slider = horizontalSlider;
            sliderInstance.divSliderValue = divSliderValue;
            this._sliderCollection.push(sliderInstance);
            horizontalSlider.tabCount = tabCount;
            appGlobals.shareOptions.arrBufferDistance[tabCount] = bufferDistance;
            this.unitValues[tabCount] = this._getDistanceUnit(appGlobals.configData.DistanceUnitSettings.DistanceUnitName);
            if (appGlobals.configData.DistanceUnitSettings.MaximumValue > 0) {
                horizontalRule.domNode.lastChild.innerHTML = appGlobals.configData.DistanceUnitSettings.MaximumValue;
                horizontalSlider.maximum = appGlobals.configData.DistanceUnitSettings.MaximumValue;
            } else {
                horizontalRule.domNode.lastChild.innerHTML = 1000;
                horizontalSlider.maximum = 1000;
            }
            if (appGlobals.configData.DistanceUnitSettings.MinimumValue >= 0) {
                horizontalRule.domNode.firstChild.innerHTML = appGlobals.configData.DistanceUnitSettings.MinimumValue;
            } else {
                horizontalRule.domNode.firstChild.innerHTML = 0;
            }

            domStyle.set(horizontalRule.domNode.lastChild, "text-align", "right");
            domStyle.set(horizontalRule.domNode.lastChild, "width", "318px");
            domStyle.set(horizontalRule.domNode.lastChild, "left", "0");
            domAttr.set(divSliderValue, "distanceUnit", appGlobals.configData.DistanceUnitSettings.DistanceUnitName.toString());
            domAttr.set(divSliderValue, "innerHTML", horizontalSlider.value.toString() + " " + appGlobals.configData.DistanceUnitSettings.DistanceUnitName);
            _self = this;

            /**
            * call back for slider change event
            * @param {object} slider value
            * @memberOf widgets/siteLocator/siteLocatorHelper
            */
            on(horizontalSlider, "change", function (value) {
                if (Number(value) > Number(horizontalSlider.maximum)) {
                    horizontalSlider.setValue(horizontalSlider.maximum);
                }
                domAttr.set(divSliderValue, "innerHTML", Math.round(value) + " " + domAttr.get(divSliderValue, "distanceUnit"));
                if (_self.workflowCount === 0 && domClass.contains(_self.filterIcon, "esriCTFilterEnabled")) {
                    domClass.add(_self.clearFilterBuilding, "esriCTClearFilterIconEnable");
                } else if (_self.workflowCount === 1 && domClass.contains(_self.filterIconSites, "esriCTFilterEnabled")) {
                    domClass.add(_self.clearFilterSites, "esriCTClearFilterIconEnable");
                } else if (_self.workflowCount === 2 && domClass.contains(_self.clearFilterBusiness, "esriCTClearFilterIconEnable")) {
                    domClass.add(_self.clearFilterBusiness, "esriCTClearFilterIconEnable");
                }
                setTimeout(function () {
                    if (appGlobals.shareOptions.arrBufferDistance[_self.workflowCount] !== value) {
                        if (!_self.sliderReset) {
                            if (_self.featureGeometry && _self.featureGeometry[_self.workflowCount]) {
                                _self._createBuffer(_self.featureGeometry[_self.workflowCount], Math.round(value), true);
                                if (_self.workflowCount === 0 && _self.selectBusinessSortForBuilding) {
                                    appGlobals.shareOptions.sortingData = null;
                                    _self.selectBusinessSortForBuilding.set("value", sharedNls.titles.select);
                                } else if (_self.workflowCount === 1 && _self.selectBusinessSortForSites) {
                                    appGlobals.shareOptions.sortingData = null;
                                    _self.selectBusinessSortForSites.set("value", sharedNls.titles.select);
                                } else if (_self.workflowCount === 2 && _self.selectSortOption) {
                                    _self.selectSortOption.set("value", sharedNls.titles.select);
                                } else {
                                    appGlobals.shareOptions.arrBufferDistance[_self.workflowCount] = Math.round(value);
                                }
                            } else {
                                appGlobals.shareOptions.arrBufferDistance[_self.workflowCount] = Math.round(value);
                            }
                        } else {
                            _self.sliderReset = false;
                            topic.publish("hideProgressIndicator");
                        }
                    } else {
                        _self.sliderReset = false;
                    }
                }, 500);
            });
        },

        /**
        * set visibility for enabled/disabled tab{work flow}
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setTabVisibility: function () {
            var j, countEnabledTab = 0, arrEnabledTab = [];
            // loop all workflows from config file
            for (j = 0; j < appGlobals.configData.Workflows.length; j++) {
                // check visibility of workflows and accordingly display the container
                if (!appGlobals.configData.Workflows[j].Enabled) {
                    switch (appGlobals.configData.Workflows[j].Name) {
                    case appGlobals.configData.Workflows[0].Name:
                        domStyle.set(this.esriCTsearchContainerBuilding, "display", "none");
                        domStyle.set(this.searchContentBuilding, "display", "none");
                        break;
                    case appGlobals.configData.Workflows[1].Name:
                        domStyle.set(this.esriCTsearchContainerSites, "display", "none");
                        domStyle.set(this.searchContentSites, "display", "none");
                        break;
                    case appGlobals.configData.Workflows[2].Name:
                        domStyle.set(this.esriCTsearchContainerBusiness, "display", "none");
                        domStyle.set(this.searchContentBusiness, "display", "none");
                        break;
                    case appGlobals.configData.Workflows[3].Name:
                        domStyle.set(this.esriCTsearchContainerCommunities, "display", "none");
                        domStyle.set(this.searchContentCommunities, "display", "none");
                        break;
                    }
                } else {
                    // check visibility of workflows and push the data(container and content node) in an array
                    switch (appGlobals.configData.Workflows[j].Name) {
                    case appGlobals.configData.Workflows[0].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerBuilding, Content: this.searchContentBuilding });
                        break;
                    case appGlobals.configData.Workflows[1].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerSites, Content: this.searchContentSites });
                        break;
                    case appGlobals.configData.Workflows[2].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerBusiness, Content: this.searchContentBusiness });
                        break;
                    case appGlobals.configData.Workflows[3].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerCommunities, Content: this.searchContentCommunities });
                        if (!appGlobals.configData.Workflows[3].EnableSearch) {
                            domStyle.set(this.divAddressSearchCommunities, "display", "none");
                            domStyle.set(this.searchBox, "display", "none");
                        }
                        if (!appGlobals.configData.Workflows[3].EnableDropdown) {
                            domStyle.set(this.divDropDownSearch, "display", "none");
                        }
                        if (!(appGlobals.configData.Workflows[3].EnableSearch || appGlobals.configData.Workflows[3].EnableDropdown)) {
                            domStyle.set(this.esriCTsearchContainerCommunities, "display", "none");
                            domStyle.set(this.searchContentCommunities, "display", "none");
                        }
                        break;
                    }
                    countEnabledTab++;
                }
            }
            if (countEnabledTab === 0) {
                alert(sharedNls.errorMessages.disableTab);
            } else {
                // check the shared URL for "workflowCount" to show selected tab when application is loaded first time while sharing
                if (window.location.toString().split("$workflowCount=").length > 1) {
                    this._showTab(query(".esriCTTab")[window.location.toString().split("$workflowCount=")[1].split("$")[0]], query(".esriCTContentTab")[window.location.toString().split("$workflowCount=")[1].split("$")[0]]);
                } else {
                    // call show tab
                    this._showTab(arrEnabledTab[0].Container, arrEnabledTab[0].Content);
                }
            }
        },

        /**
        * show tab based on selected tab
        * @param {object} node for tab container
        * @param {object} node for tab content
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _showTab: function (tabNode, contentNode) {
            var i;
            // loop all the child element of main container(divDirectionContainer)
            for (i = 0; i < this.divDirectionContainer.children.length; i++) {
                if (contentNode === this.TabContentContainer.children[i]) {
                    domStyle.set(this.TabContentContainer.children[i], "display", "block");
                    this.workflowCount = i;
                    appGlobals.shareOptions.workflowCount = i;
                    this.map.graphics.clear();
                    this.map.getLayer("esriFeatureGraphicsLayer").clear();
                    this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                    this.map.getLayer("esriBufferGraphicsLayer").clear();
                    if (this.lastGeometry[this.workflowCount]) {
                        this.isSharedExtent = true;
                        this.showBuffer(this.lastGeometry[this.workflowCount]);
                    }
                    if (this.featureGraphics[i]) {
                        this.map.getLayer("esriFeatureGraphicsLayer").add(this.featureGraphics[i]);
                        this.map.setLevel(appGlobals.configData.ZoomLevel);
                        this.map.centerAt(this.featureGraphics[i].geometry);
                        this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].show();
                    } else if (this.lastGeometry[this.workflowCount]) {
                        this.map.setExtent(this.lastGeometry[this.workflowCount][0].getExtent(), true);
                    }
                    if (this.featureGeometry[this.workflowCount]) {
                        this.addPushPin(this.featureGeometry[this.workflowCount]);
                    }
                    if (appGlobals.configData.Workflows[this.workflowCount].SearchSettings) {
                        this.opeartionLayer = this.getCurrentOperationalLayer(this.workflowCount);
                    }
                } else {
                    domStyle.set(this.TabContentContainer.children[i], "display", "none");
                }
                if (this.arrTabClass.length !== this.divDirectionContainer.children.length) {
                    this.arrTabClass[i] = this.divDirectionContainer.children[i].className;
                }
                if (tabNode === this.divDirectionContainer.children[i]) {
                    domClass.add(this.divDirectionContainer.children[i], "esriCTsearchContainerSitesSelected", this.divDirectionContainer.children[i].className);
                } else {
                    if (this.arrTabClass.length === this.divDirectionContainer.children.length) {
                        domClass.replace(this.divDirectionContainer.children[i], this.arrTabClass[i], "esriCTsearchContainerSitesSelected");
                    }
                }
            }
        },

        /**
        * add push pin on map point
        * @param {object} map point for push pin
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        addPushPin: function (mapPoint) {
            var geoLocationPushpin, locatorMarkupSymbol, graphic;
            geoLocationPushpin = dojoConfig.baseURL + appGlobals.configData.LocatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new PictureMarkerSymbol(geoLocationPushpin, appGlobals.configData.LocatorSettings.MarkupSymbolSize.width, appGlobals.configData.LocatorSettings.MarkupSymbolSize.height);
            graphic = new Graphic(mapPoint, locatorMarkupSymbol, {}, null);
            if (this.workflowCount === 3) {
                this.featureGraphics[this.workflowCount] = graphic;
            }
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
        },

        /**
        * creates list of objects to be displayed in pagination
        * @param {array} list of data for a batch
        * @param {object} Nodes to attach display list
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _createDisplayList: function (listData, containerNode) {
            if (listData) {
                var contentNode, attr, i, contentOuter, attchImages, featureInfo, j, k;
                topic.publish("hideProgressIndicator");
                domConstruct.empty(containerNode);

                for (i = 0; i < listData.length; i++) {
                    for (attr in listData[i].featureData) {
                        if (listData[i].featureData.hasOwnProperty(attr)) {
                            if (listData[i].featureData[attr] === null || listData[i].featureData[attr] === "") {
                                listData[i].featureData[attr] = appGlobals.configData.ShowNullValueAs;
                            }
                        }
                    }
                }
                if (this.workflowCount === 0) {
                    contentNode = domConstruct.create("div", { "class": "esriCTResultContentBuilding" }, containerNode);
                }
                if (this.workflowCount === 1) {
                    contentNode = domConstruct.create("div", { "class": "esriCTResultContentSites" }, containerNode);
                }
                for (i = 0; i < listData.length; i++) {
                    contentOuter = domConstruct.create("div", { "class": "esriCTOuterContent" }, contentNode);
                    domAttr.set(contentOuter, "index", i);
                    if (this.opeartionLayer.hasAttachments && appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.ShowAttachments) {
                        attchImages = domConstruct.create("div", { "class": "esriCTAttchImages" }, contentOuter);
                        if (listData[i].attachmentData) {
                            domConstruct.create("img", { "src": listData[i].attachmentData[0].url }, attchImages);
                        } else {

                            domConstruct.create("img", { "src": dojoConfig.baseURL + "/js/library/themes/images/not-available.png" }, attchImages);
                        }
                        featureInfo = domConstruct.create("div", { "class": "esriCTFeatureInfoAttachment" }, contentOuter);
                        this.own(on(contentOuter, "click", lang.hitch(this, this._getAttchmentImageAndInformation)));

                        for (j = 0; j < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields.length; j++) {
                            domConstruct.create("div", { "class": "esriCTfeatureField", "innerHTML": appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[j].DisplayText + " " + listData[i].featureData[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[j].FieldName] }, featureInfo);
                        }
                    } else {
                        featureInfo = domConstruct.create("div", { "class": "esriCTFeatureInfo" }, contentOuter);
                        this.own(on(contentOuter, "click", lang.hitch(this, this._getAttchmentImageAndInformation)));
                        for (k = 0; k < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields.length; k++) {
                            domConstruct.create("div", { "class": "esriCTfeatureField", "innerHTML": appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[k].DisplayText + " " + listData[i].featureData[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[k].FieldName] }, featureInfo);
                        }
                    }
                }
            }
            if (window.location.toString().split("$selectedObjectIndex=").length > 1 && !this.isIndexShared) {
                if (Number(window.location.toString().split("$workflowCount=")[1].split("$")[0]) === appGlobals.shareOptions.workflowCount) {
                    this.isSharedExtent = true;
                    this.isIndexShared = true;
                    this._getAttchmentImageAndInformation(Number(window.location.toString().split("$selectedObjectIndex=")[1].split("$")[0]));
                }
            }
        },

        /**
        * perform query to get geometry and other data based on object selection from display list
        * @param {object} Selected value
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _getAttchmentImageAndInformation: function (value) {
            var index, dataSelected;
            if (isNaN(value)) {
                index = domAttr.get(value.currentTarget, "index").toString();
            } else {
                index = value.toString();
            }
            appGlobals.shareOptions.selectedObjectIndex[this.workflowCount] = index;
            topic.publish("showProgressIndicator");
            if (this.workflowCount === 0) {
                dataSelected = this.buildingTabData[index];
                this._attachmentQuery(dataSelected, this.attachmentOuterDiv, this.mainDivBuilding, this.searchContentBuilding);
            } else if (this.workflowCount === 1) {
                dataSelected = this.sitesTabData[index];
                this._attachmentQuery(dataSelected, this.attachmentOuterDivSites, this.mainDivSites, this.searchContentSites);
            }
        },

        /**
        * perform query to get geometry and other data based on object selection from display list
        * @param {object} Selected value
        * @param {object} Data for selected value
        * @param {object} html node for attachment
        * @param {object} html node for main container
        * @param {object} html node search content
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _attachmentQuery: function (dataSelected, attachmentNode, mainDivNode, searchContentNode) {
            var backwardImage, backToResultDiv, arrAttachmentURL = [], backToResult, attachmentDiv, attachmentImageClickDiv, imageCount = 0, prevNextdiv,
                prevdiv, nextdiv, outfields = [], resultSelectionQuerytask, resultSelectQuery, i, j, k, geometryService, params, propertyHeaderInfo,
                attributedata, propertyInfoDiv, attributesInfo;
            domConstruct.empty(attachmentNode);
            domStyle.set(attachmentNode, "display", "block");
            domStyle.set(mainDivNode, "display", "none");
            domConstruct.create("div", { "class": "esriCTAttachmentOuterDiv" }, searchContentNode);
            backToResultDiv = domConstruct.create("div", { "class": "esriCTBackToResultImage" }, attachmentNode);
            backwardImage = domConstruct.create("div", { "class": "esriCTBackwardImage" }, backToResultDiv);
            backToResult = domConstruct.create("div", { "class": "esriCTBackToResult" }, backToResultDiv);
            domAttr.set(backToResult, "innerHTML", sharedNls.titles.result);
            if (dataSelected.attachmentData) {
                attachmentDiv = domConstruct.create("div", { "class": "esriCTAttachmentDiv" }, attachmentNode);
                attachmentImageClickDiv = domConstruct.create("img", { "src": dataSelected.attachmentData[0].url }, attachmentDiv);
                if (dataSelected.attachmentData.length > 0) {
                    for (k = 0; k < dataSelected.attachmentData.length; k++) {
                        arrAttachmentURL.push(dataSelected.attachmentData[k].url);
                    }
                    // if attachment length is greater than one then display previous and next arrow
                    if (dataSelected.attachmentData.length > 1) {
                        prevNextdiv = domConstruct.create("div", { "class": "esriCTPrevNext" }, attachmentNode);
                        prevdiv = domConstruct.create("div", { "class": "esriCTPrev" }, prevNextdiv);
                        nextdiv = domConstruct.create("div", { "class": "esriCTNext" }, prevNextdiv);

                        this.own(on(prevdiv, "click", lang.hitch(this, function (value) {
                            imageCount--;
                            if (imageCount < 0) {
                                imageCount = dataSelected.attachmentData.length - 1;
                            }
                            domAttr.set(attachmentImageClickDiv, "src", dataSelected.attachmentData[imageCount].url);
                        })));
                        this.own(on(nextdiv, "click", lang.hitch(this, function (value) {
                            imageCount++;
                            if (imageCount === dataSelected.attachmentData.length) {
                                imageCount = 0;
                            }
                            domAttr.set(attachmentImageClickDiv, "src", dataSelected.attachmentData[imageCount].url);
                        })));
                    }
                }
            }
            this._downloadDropDown(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.DownloadSettings, attachmentNode);
            resultSelectionQuerytask = new QueryTask(this.opeartionLayer.url);
            resultSelectQuery = new Query();
            resultSelectQuery.returnGeometry = true;
            resultSelectQuery.outSpatialReference = this.map.spatialReference;
            resultSelectQuery.objectIds = [dataSelected.featureData[this.opeartionLayer.objectIdField]];
            for (i = 0; i < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields.length; i++) {
                outfields.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[i].FieldName);
            }
            resultSelectQuery.outFields = outfields;
            resultSelectionQuerytask.execute(resultSelectQuery, lang.hitch(this, function (featureSet) {
                var symbol, graphic, arraProperyDisplayData = [], isGeoenriched = false, enrichIndex;
                if (featureSet.features[0].geometry.getExtent()) {
                    symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.65]), 3), new Color([255, 0, 0, 0.35]));
                    graphic = new Graphic(featureSet.features[0].geometry, symbol, {}, null);
                    graphic.attributes.layerURL = this.opeartionLayer.url;
                    if (!this.isSharedExtent) {
                        this.map.setExtent(featureSet.features[0].geometry.getExtent());
                    }
                    this.isSharedExtent = false;
                } else {
                    symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, appGlobals.configData.LocatorRippleSize, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(appGlobals.configData.RippleColor.split(",")[0], 10), parseInt(appGlobals.configData.RippleColor.split(",")[1], 10), parseInt(appGlobals.configData.RippleColor.split(",")[2], 10), 0.65]), 4), new Color([0, 0, 0, 0.2]));
                    graphic = new Graphic(featureSet.features[0].geometry, symbol, {}, null);
                    graphic.attributes.layerURL = this.opeartionLayer.url;
                    if (!this.isSharedExtent) {
                        this.map.setLevel(appGlobals.configData.ZoomLevel);
                        this.map.centerAt(featureSet.features[0].geometry);
                    }
                    this.isSharedExtent = false;
                }
                this.map.getLayer("esriFeatureGraphicsLayer").clear();
                this.featureGraphics[this.workflowCount] = graphic;
                this.map.getLayer("esriFeatureGraphicsLayer").add(graphic);
                if (this.opeartionLayer && this.opeartionLayer.visibleAtMapScale) {
                    this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].show();
                } else {
                    this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].hide();
                }
                propertyInfoDiv = domConstruct.create("div", { "class": "esriCTpropertyInfoDiv" }, attachmentNode);
                propertyHeaderInfo = domConstruct.create("div", { "class": "esriCTHeaderInfoDiv" }, propertyInfoDiv);
                domAttr.set(propertyHeaderInfo, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.DownloadSettings[0].DisplayOptionTitle);

                for (j = 0; j < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields.length; j++) {
                    attributesInfo = featureSet.features[0].attributes[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].FieldName];
                    if (attributesInfo === null || attributesInfo === "") {
                        attributesInfo = appGlobals.configData.ShowNullValueAs;
                    }
                    attributedata = domConstruct.create("div", { "class": "esriCTSelectedfeatureField" }, propertyInfoDiv);
                    if (isNaN(attributesInfo)) {
                        arraProperyDisplayData.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + attributesInfo);
                        domAttr.set(attributedata, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + " " + attributesInfo);
                    } else {
                        if (Number(attributesInfo) % 1 === 0) {
                            arraProperyDisplayData.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + attributesInfo);
                            domAttr.set(attributedata, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + " " + attributesInfo);
                        } else {
                            arraProperyDisplayData.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + Number(attributesInfo).toFixed(2));
                            domAttr.set(attributedata, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + " " + Number(attributesInfo).toFixed(2));
                        }
                    }
                }
                this.arrReportDataJson[this.workflowCount] = {};
                this.arrReportDataJson[this.workflowCount].reportData = {};
                this.arrReportDataJson[this.workflowCount].reportData[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.DownloadSettings[0].DisplayOptionTitle.toString()] = arraProperyDisplayData;
                this.arrReportDataJson[this.workflowCount].attachmentData = arrAttachmentURL;
                if (this.arrGeoenrichData[this.workflowCount] !== null) {
                    for (enrichIndex = 0; enrichIndex < this.arrGeoenrichData[this.workflowCount].length; enrichIndex++) {
                        if (this.arrGeoenrichData[this.workflowCount][enrichIndex].ID === dataSelected.featureData[this.opeartionLayer.objectIdField]) {
                            this._geoEnrichmentRequestHandler(this.arrGeoenrichData[this.workflowCount][enrichIndex].data, this.arrGeoenrichData[this.workflowCount][enrichIndex].ID);
                            isGeoenriched = true;
                            break;
                        }
                    }
                    if (!isGeoenriched) {
                        this.arrGeoenrichData[this.workflowCount].push({ ID: dataSelected.featureData[this.opeartionLayer.objectIdField] });
                    }
                } else {
                    this.arrGeoenrichData[this.workflowCount] = [];
                    this.arrGeoenrichData[this.workflowCount].push({ ID: dataSelected.featureData[[this.opeartionLayer.objectIdField]] });
                }
                if (!isGeoenriched) {
                    geometryService = new GeometryService(appGlobals.configData.GeometryService);
                    params = new BufferParameters();
                    params.distances = [appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.GeoenrichmentDistance.BufferDistance];
                    params.bufferSpatialReference = this.map.spatialReference;
                    params.outSpatialReference = this.map.spatialReference;
                    params.geometries = [featureSet.features[0].geometry];
                    params.unit = GeometryService[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.GeoenrichmentDistance.Unit];
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        topic.publish("showProgressIndicator");
                        this._enrichData(geometries, this.workflowCount, null);
                    }), function (error) {
                        topic.publish("hideProgressIndicator");
                    });
                }
            }));
            this.own(on(backToResult, "click", lang.hitch(this, function () {
                this._getBackToTab(attachmentNode, mainDivNode);
            })));
            this.own(on(backwardImage, "click", lang.hitch(this, function () {
                this._getBackToTab(attachmentNode, mainDivNode);
            })));
        },

        /**
        * back button handler building tab
        * @param {object} attachment div node
        * @param {object} parent div node for attachment
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _getBackToTab: function (attachmentNode, mainDivNode) {
            domStyle.set(attachmentNode, "display", "none");
            domStyle.set(mainDivNode, "display", "block");
            this.map.getLayer("esriFeatureGraphicsLayer").clear();
            this.featureGraphics[this.workflowCount] = null;
            appGlobals.shareOptions.selectedObjectIndex[this.workflowCount] = undefined;
            if (this.workflowCount === 0) {
                this._createDisplayList(this.buildingTabData, this.outerResultContainerBuilding);
            } else if ((this.workflowCount === 1)) {
                this._createDisplayList(this.sitesTabData, this.outerResultContainerSites);
            }
        },

        /**
        * enables and disables search for communities tab
        * @param {object} search check box
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _communitiesSearchRadioButtonHandler: function (rdoCommunitiesAddressSearch) {
            domClass.remove(this.divSearchCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.txtAddressCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.closeCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.clearhideCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.divAddressResultsCommunities, "esriCTDisableSearch");
            this.txtAddressCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            this.closeCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            this.esriCTimgLocateCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            this.divSearchCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            if (this.comAreaList) {
                this.comAreaList.disabled = rdoCommunitiesAddressSearch.checked;
                this.comAreaList.reset();
            }
            appGlobals.shareOptions.communitySelectionFeature = null;
        },

        /**
        * get operational layer based on tab(work flow) selection
        * @param {number} count of tab(workflow)
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        getCurrentOperationalLayer: function (tabCount) {
            var layer, i;
            for (i = 0; i < appGlobals.operationalLayers.length; i++) {
                if (appGlobals.operationalLayers[i].url === appGlobals.configData.Workflows[tabCount].SearchSettings[0].QueryURL) {
                    layer = appGlobals.operationalLayers[i].layerObject;
                    break;
                }
            }
            return layer;
        },

        /**
        * Show hide widget container
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _showHideInfoRouteContainer: function () {
            if (html.coords(this.applicationHeaderSearchContainer).h > 0) {
                /**
                * when user clicks on share icon in header panel, close the sharing panel if it is open
                */
                domClass.add(this.applicationHeaderSearchContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    domClass.remove(this.logoContainer, "esriCTMapLogo");
                }
                domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
                domClass.replace(this.applicationHeaderSearchContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                topic.publish("setMaxLegendLength");
            } else {
                /**
                * when user clicks on share icon in header panel, open the sharing panel if it is closed
                */
                domClass.remove(this.applicationHeaderSearchContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    domClass.add(this.logoContainer, "esriCTMapLogo");
                }
                domClass.replace(this.domNode, "esriCTHeaderSearchSelected", "esriCTHeaderSearch");
                domClass.replace(this.applicationHeaderSearchContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
            }
        },

        /**
        * set default value of locator text box as specified in configuration file
        * @param {array} locator settings specified in configuration file(appGlobals.configData.LocatorSettings.Locators)
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setDefaultTextboxValue: function (txtAddressParam) {
            var locatorSettings;
            locatorSettings = appGlobals.configData.LocatorSettings;
            domAttr.set(txtAddressParam, "defaultAddress", locatorSettings.LocatorDefaultAddress);
        },

        /**
        * get distance unit based on unit selection
        * @param {string} input distance unit
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _getDistanceUnit: function (strUnit) {
            var sliderUnitValue;
            if (strUnit.toLowerCase() === "miles") {
                sliderUnitValue = "UNIT_STATUTE_MILE";
            } else if (strUnit.toLowerCase() === "feet") {
                sliderUnitValue = "UNIT_FOOT";
            } else if (strUnit.toLowerCase() === "meters") {
                sliderUnitValue = "UNIT_METER";
            } else if (strUnit.toLowerCase() === "kilometers") {
                sliderUnitValue = "UNIT_KILOMETER";
            } else {
                sliderUnitValue = "UNIT_STATUTE_MILE";
            }
            return sliderUnitValue;
        }
    });
});
