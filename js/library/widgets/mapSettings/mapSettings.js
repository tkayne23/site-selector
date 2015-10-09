/*global define,dojo,dojoConfig,alert,esri,appGlobals */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
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
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/_base/array",
    "esri/arcgis/utils",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/date/locale",
    "dojo/query",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "widgets/baseMapGallery/baseMapGallery",
    "esri/geometry/Extent",
    "esri/dijit/HomeButton",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/topic",
    "widgets/infoWindow/infoWindow",
    "dojo/string",
    "esri/geometry/Point",
    "dojo/domReady!"
], function (declare, domConstruct, domStyle, lang, on, array, esriUtils, dom, domAttr, locale, query, Query, QueryTask, domClass, _WidgetBase, sharedNls, FeatureLayer, GraphicsLayer, BaseMapGallery, GeometryExtent, HomeButton, Deferred, all, topic, InfoWindow, string, Point) {
    //========================================================================================================================//

    return declare([_WidgetBase], {
        map: null,
        tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
        featureGraphicsLayerId: "esriFeatureGraphicsLayer",
        bufferGraphicLayerId: "esriBufferGraphicsLayer",
        sharedNls: sharedNls,
        isInfoPopupShown: false,

        /**
        * initialize map object
        *
        * @class
        * @name widgets/mapSettings/mapSettings
        */
        postCreate: function () {
            var mapDeferred;
            topic.publish("showProgressIndicator");

            /**
            * load map
            * @param {string} appGlobals.configData.BaseMapLayers Basemap settings specified in configuration file
            */

            mapDeferred = esriUtils.createMap(appGlobals.configData.WebMapId, "esriCTParentDivContainer", {
                mapOptions: {
                    slider: true,
                    showAttribution: appGlobals.configData.ShowMapAttribution
                },
                ignorePopups: true
            });
            mapDeferred.then(lang.hitch(this, function (response) {
                this.map = response.map;
                appGlobals.shareOptions.webMapExtent = new GeometryExtent(response.map.extent.xmin, response.map.extent.ymin, response.map.extent.xmax, response.map.extent.ymax, this.map.spatialReference);
                appGlobals.shareOptions.selectedBasemapIndex = null;
                topic.publish("filterRedundantBasemap", response.itemInfo);
                //subscribe event to display customized infowindow on map
                topic.subscribe("setInfoWindowOnMap", lang.hitch(this, function (infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight) {
                    this._onSetInfoWindowPosition(infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight);
                }));
                //subscribe event to hide customized infowindow
                topic.subscribe("hideInfoWindow", lang.hitch(this, this._hideInfoWindow));
                //initialize customized infowindow widget
                this.infoWindowPanel = new InfoWindow({ infoWindowWidth: appGlobals.configData.InfoPopupWidth, infoWindowHeight: appGlobals.configData.InfoPopupHeight });
                this._fetchWebMapData(response);
                topic.publish("hideProgressIndicator");
                this._mapOnLoad();
                appGlobals.shareOptions.isInfoPopupShared = false;
                this._activateMapEvents();
            }), function (Error) {
                domStyle.set(dom.byId("esriCTParentDivContainer"), "display", "none");
                alert(Error.message);
            });
        },

        /**
        * update infoWindow content when it's position is set on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _onSetInfoWindowPosition: function (infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight) {
            this.infoWindowPanel.resize(infoPopupWidth, infoPopupHeight);
            this.infoWindowPanel.hide();
            this.infoWindowPanel.setTitle(infoTitle);
            domStyle.set(query(".esriCTinfoWindow")[0], "visibility", "visible");
            this.infoWindowPanel.show(divInfoDetailsTab, screenPoint);
            appGlobals.shareOptions.infoWindowIsShowing = true;
            this._onSetMapTipPosition();
        },

        /**
        * set infoWindow anchor position on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _onSetMapTipPosition: function () {
            if (appGlobals.shareOptions.infoWindowIsShowing && this.selectedMapPoint) {
                var screenPoint = this.map.toScreen(this.selectedMapPoint);
                screenPoint.y = this.map.height - screenPoint.y;
                this.infoWindowPanel.setLocation(screenPoint);
            }
        },

        /**
        * fetch web map operational layers and generate settings
        * @memberOf widgets/mapSettings/mapSettings
        */
        _fetchWebMapData: function (response) {
            var webMapDetails = response.itemInfo.itemData, i, defArr = [], def, mapServerData;
            for (i = 0; i < webMapDetails.operationalLayers.length; i++) {
                // check for webmap mapserver and feature layer
                if (webMapDetails.operationalLayers[i].visibility && webMapDetails.operationalLayers[i].layerObject) {
                    mapServerData = webMapDetails.operationalLayers[i].resourceInfo.layers || webMapDetails.operationalLayers[i].layerObject.layerInfos;
                    if (mapServerData) {
                        this._setDynamicOperationLayers(webMapDetails.operationalLayers[i], mapServerData, defArr);
                    } else {
                        def = new Deferred();
                        defArr.push(def);
                        def.resolve(webMapDetails.operationalLayers[i]);
                    }
                }
            }
            all(defArr).then(lang.hitch(this, function (results) {
                appGlobals.operationalLayers = [];
                for (i = 0; i < results.length; i++) {
                    if (results[i]) {
                        //set webmap edited renderer in layer object
                        if (results[i].layerDefinition) {
                            if (results[i].layerDefinition.drawingInfo) {
                                results[i].layerObject.webmapRenderer = results[i].layerDefinition.drawingInfo.renderer;
                            }
                            //set layer's definitionExpression
                            if (results[i].layerDefinition.definitionExpression) {
                                results[i].layerObject.webmapDefinitionExpression = results[i].layerDefinition.definitionExpression;
                            }
                        }
                        appGlobals.operationalLayers.push(results[i]);
                        this._createLayerURL(results[i]);
                    }
                }
                //publish event when required data is fetched from map layers
                topic.publish("setMap", this.map);
            }));
        },

        /**
        * set Dynamic Operation Layers
        * @memberOf widgets/mapSettings/mapSettings
        */
        _setDynamicOperationLayers: function (operationalLayer, mapServerData, defArr) {
            var url, layerUrl, i, operationalLayerObj = {};
            url = operationalLayer.url;
            for (i = 0; i < mapServerData.length; i++) {
                //check visibility of operational layer
                if (array.indexOf(operationalLayer.layerObject.visibleLayers, mapServerData[i].id) !== -1) {
                    operationalLayerObj = this._getLayerObject(operationalLayer, mapServerData[i]);
                    operationalLayerObj.title = operationalLayer.title;
                    layerUrl = url + "/" + mapServerData[i].id;
                    defArr.push(this._loadFeatureLayer(layerUrl, operationalLayerObj));
                }
            }
        },

        /**
        * load feature layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _loadFeatureLayer: function (layerUrl, layerObject) {
            var dynamicOperationalLayer = {}, fLayer, def = new Deferred();
            fLayer = new FeatureLayer(layerUrl);
            on(fLayer, "load", lang.hitch(this, function (evt) {
                dynamicOperationalLayer = layerObject;
                dynamicOperationalLayer.layerObject = evt.layer;
                dynamicOperationalLayer.url = evt.layer.url;
                dynamicOperationalLayer.layerObject.visibleAtMapScale = true;
                def.resolve(dynamicOperationalLayer);
            }));
            return def;
        },

        /**
        * get layer object info
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getLayerObject: function (operationalLayer, layerData) {
            var i;
            if (operationalLayer.layers) {
                for (i = 0; i < operationalLayer.layers.length; i++) {
                    if (operationalLayer.layers[i].id === layerData.id) {
                        layerData = operationalLayer.layers[i];
                        break;
                    }
                }
            }
            return layerData;
        },
        /**
        * activate events on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _activateMapEvents: function () {
            this.map.on("click", lang.hitch(this, function (evt) {
                topic.publish("loadingIndicatorHandler");
                this._showInfoWindowOnMap(evt.mapPoint);
            }));
            this.map.on("extent-change", lang.hitch(this, function () {
                var mapPoint;
                if (window.location.toString().split("$mapPointForInfowindow=").length > 1 && !this.isInfoPopupShown) {
                    this.isInfoPopupShown = true;
                    appGlobals.shareOptions.isInfoPopupShared = true;
                    mapPoint = new Point(window.location.toString().split("$mapPointForInfowindow=")[1].split("$")[0].split(",")[0], window.location.toString().split("$mapPointForInfowindow=")[1].split("$")[0].split(",")[1], this.map.spatialReference);
                    this._showInfoWindowOnMap(mapPoint);
                    appGlobals.shareOptions.mapPointForInfowindow = mapPoint.x + "," + mapPoint.y;
                } else {
                    this._onSetMapTipPosition();
                }
            }));
        },

        /**
        * show infoWindow on map
        * @param{object} mapPoint is location on map to show infoWindow
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showInfoWindowOnMap: function (mapPoint) {
            var onMapFeaturArray = [], featureArray = [], j, i;
            for (i = 0; i < appGlobals.operationalLayers.length; i++) {
                if (appGlobals.operationalLayers[i].layerObject.visibleAtMapScale && appGlobals.operationalLayers[i].popupInfo) {
                    if (!appGlobals.operationalLayers[i].layerObject.hideInfo) {
                        this._executeQueryTask(i, mapPoint, appGlobals.operationalLayers[i].url, onMapFeaturArray);
                    }
                }
            }
            all(onMapFeaturArray).then(lang.hitch(this, function (result) {
                if (result) {
                    for (j = 0; j < result.length; j++) {
                        if (result[j]) {
                            if (result[j].features.length > 0) {
                                for (i = 0; i < result[j].features.length; i++) {
                                    featureArray.push({
                                        attr: result[j].features[i],
                                        layerIndex: result[j].layerIndex,
                                        fields: result[j].fields
                                    });
                                }
                            }
                        }
                    }
                    this._fetchQueryResults(featureArray, mapPoint);
                }
            }));
        },

        /**
        * hide infoWindow
        * @memberOf widgets/mapSettings/mapSettings
        */
        _hideInfoWindow: function () {
            //check if infoWindow is opened
            if (appGlobals.shareOptions.infoWindowIsShowing && this.infoWindowPanel) {
                this.infoWindowPanel.hide();
                appGlobals.shareOptions.infoWindowIsShowing = false;
                appGlobals.shareOptions.mapPointForInfowindow = null;
            }
        },
        /**
        * fetch infoWindow data from query task result
        * @memberOf widgets/mapSettings/mapSettings
        */
        _fetchQueryResults: function (featureArray, mapPoint) {
            var point, headerPanel, headerPanelnew;
            headerPanel = query('.esriCTdivInfoWindowCarousel')[0];
            headerPanelnew = query('.esriCTheaderPanel')[0];
            if (featureArray.length > 0) {
                this.count = 0;
                appGlobals.shareOptions.mapPointForInfowindow = mapPoint.x + "," + mapPoint.y;
                if (featureArray[this.count].attr.geometry.type !== "point") {
                    point = mapPoint;
                } else {
                    point = featureArray[this.count].attr.geometry;
                }
                this._createInfoWindowContent(point, featureArray, this.count, false);
                if (featureArray.length === 1) {
                    domClass.remove(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                    domStyle.set(headerPanel, "display", "none");
                    domClass.add(headerPanelnew, "esriCTNewHeaderPanel");
                } else {
                    domAttr.set(query(".esriCTdivInfoTotalFeatureCount")[0], "innerHTML", '/' + featureArray.length);
                    domStyle.set(headerPanel, "display", "block");
                    domClass.remove(headerPanelnew, "esriCTNewHeaderPanel");
                    query(".esriCTdivInfoRightArrow")[0].onclick = lang.hitch(this, function () {
                        this._nextInfoContent(featureArray, point);
                    });
                    query(".esriCTdivInfoLeftArrow")[0].onclick = lang.hitch(this, function () {
                        this._previousInfoContent(featureArray, point);
                    });
                }
            } else {
                topic.publish("hideLoadingIndicatorHandler");
            }
        },

        /**
        * execute query task to find infoWindow data
        * @param{string} index is layer index in operational layer array
        * @memberOf widgets/mapSettings/mapSettings
        */
        _executeQueryTask: function (index, mapPoint, QueryURL, onMapFeaturArray) {
            var esriQuery, queryTask, queryOnRouteTask, currentTime, layerIndex = index, queryString;
            queryTask = new QueryTask(QueryURL);
            esriQuery = new Query();
            currentTime = new Date().getTime() + index.toString();
            queryString = currentTime + "=" + currentTime;
            //set where clause to honor definition expression configured in webmap
            if (appGlobals.operationalLayers[index].layerObject.webmapDefinitionExpression) {
                queryString += " AND " + appGlobals.operationalLayers[index].layerObject.webmapDefinitionExpression;
            }
            esriQuery.where = queryString;
            esriQuery.returnGeometry = true;
            esriQuery.geometry = this._extentFromPoint(mapPoint);
            esriQuery.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
            esriQuery.outSpatialReference = this.map.spatialReference;
            esriQuery.outFields = ["*"];
            queryOnRouteTask = queryTask.execute(esriQuery, lang.hitch(this, function (results) {
                var deferred = new Deferred();
                results.layerIndex = layerIndex;
                deferred.resolve(results);
                return deferred.promise;
            }), function (err) {
                alert(err.message);
            });
            onMapFeaturArray.push(queryOnRouteTask);
        },

        /**
        * get extent from map point
        * @memberOf widgets/mapSettings/mapSettings
        */
        _extentFromPoint: function (point) {
            var screenPoint, sourcePoint, destinationPoint, sourceMapPoint, destinationMapPoint, tolerance = 15;
            screenPoint = this.map.toScreen(point);
            sourcePoint = new Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
            destinationPoint = new Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
            sourceMapPoint = this.map.toMap(sourcePoint);
            destinationMapPoint = this.map.toMap(destinationPoint);
            return new GeometryExtent(sourceMapPoint.x, sourceMapPoint.y, destinationMapPoint.x, destinationMapPoint.y, this.map.spatialReference);
        },

        /**
        * generate Id and title of operational layers
        * @param{string} string value of layer URL
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createLayerURL: function (layerObject) {
            var layerTitle, layerId, index, searchSettings, i, str;
            for (i = 0; i < appGlobals.configData.Workflows.length; i++) {
                searchSettings = appGlobals.configData.Workflows[i].SearchSettings;
                layerTitle = layerObject.title;
                str = layerObject.url.split('/');
                layerId = str[str.length - 1];
                if (searchSettings) {
                    for (index = 0; index < searchSettings.length; index++) {
                        if (searchSettings[index].Title && searchSettings[index].QueryLayerId) {
                            if (layerTitle === searchSettings[index].Title && layerId === searchSettings[index].QueryLayerId) {
                                searchSettings[index].QueryURL = str.join("/");
                                searchSettings[index].objectIDField = layerObject.layerObject.objectIdField;
                            }
                        }
                    }
                } else if (appGlobals.configData.Workflows[i].FilterSettings.FilterLayer) {
                    if (appGlobals.configData.Workflows[i].FilterSettings.FilterLayer.Title && appGlobals.configData.Workflows[i].FilterSettings.FilterLayer.QueryLayerId) {
                        if (layerTitle === appGlobals.configData.Workflows[i].FilterSettings.FilterLayer.Title && layerId === appGlobals.configData.Workflows[i].FilterSettings.FilterLayer.QueryLayerId) {
                            appGlobals.configData.Workflows[i].FilterSettings.FilterLayer.LayerURL = str.join("/");
                        }
                    }
                }
            }
        },

        _mapOnLoad: function () {
            var home, mapDefaultExtent, graphicsLayer, imgCustomLogo, extent, featureGrapgicLayer, imgSource, bufferGraphicLayer;

            /**
            * set map extent to default extent
            * @param {string} Default extent of map
            */
            extent = this._getQueryString('extent');
            if (extent !== "") {
                mapDefaultExtent = extent.split(',');
                mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(mapDefaultExtent[0]), "ymin": parseFloat(mapDefaultExtent[1]), "xmax": parseFloat(mapDefaultExtent[2]), "ymax": parseFloat(mapDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                this.map.setExtent(mapDefaultExtent);
            }
            /**
            * load ESRI 'Home Button' widget
            */
            home = this._addHomeButton();
            domConstruct.place(home.domNode, query(".esriSimpleSliderIncrementButton")[0], "after");
            home.startup();

            if (appGlobals.configData.CustomLogoUrl && lang.trim(appGlobals.configData.CustomLogoUrl).length !== 0) {
                if (appGlobals.configData.CustomLogoUrl.match("http:") || appGlobals.configData.CustomLogoUrl.match("https:")) {
                    imgSource = appGlobals.configData.CustomLogoUrl;
                } else {
                    imgSource = dojoConfig.baseURL + appGlobals.configData.CustomLogoUrl;
                }
                imgCustomLogo = domConstruct.create("img", { "src": imgSource, "class": "esriCTCustomMapLogo" }, dom.byId("esriCTParentDivContainer"));
                domClass.add(imgCustomLogo, "esriCTCustomMapLogoBottom");
            }
            // check length of basemap layers and show base map gallery
            if (appGlobals.configData.BaseMapLayers.length > 1) {
                this._showBasMapGallery(true);
            }
            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = this.tempGraphicsLayerId;
            this.map.addLayer(graphicsLayer);
            featureGrapgicLayer = new GraphicsLayer();
            featureGrapgicLayer.id = this.featureGraphicsLayerId;
            this.map.addLayer(featureGrapgicLayer);
            bufferGraphicLayer = new GraphicsLayer();
            bufferGraphicLayer.id = this.bufferGraphicLayerId;
            this.map.addLayer(bufferGraphicLayer);
        },

        /**
        * return extent value of map
        * @param {string} Default extent of map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getQueryString: function (key) {
            var extentValue = "", regex, qs;
            regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
            qs = regex.exec(window.location.href);
            if (qs && qs.length > 0) {
                extentValue = qs[1];
            }
            return extentValue;
        },

        /**
        * load ESRI 'Home Button' widget which sets map extent to default extent
        * @return {object} Home button widget
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addHomeButton: function () {
            var home = new HomeButton({
                map: this.map
            }, domConstruct.create("div", {}, null));
            return home;
        },

        /**
        * crate an object of base map gallery
        * @return {object} base map object
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showBasMapGallery: function (isWebmap) {
            var basMapGallery = new BaseMapGallery({
                map: this.map,
                isWebmap: isWebmap
            }, domConstruct.create("div", {}, null));
            return basMapGallery;
        },

        /* return current map instance
        * @return {object} Current map instance
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getMapInstance: function () {
            return this.map;
        },

        /**
        * display next page of infoWindow on clicking of next arrow
        * @memberOf widgets/mapSettings/mapSettings
        */
        _nextInfoContent: function (featureArray, point) {
            if (!domClass.contains(query(".esriCTdivInfoRightArrow")[0], "disableArrow")) {
                if (this.count < featureArray.length) {
                    this.count++;
                }
                if (featureArray[this.count]) {
                    domClass.add(query(".esriCTdivInfoRightArrow")[0], "disableArrow");
                    this._createInfoWindowContent(point, featureArray, this.count, true);
                }
            }
        },

        /**
        * display previous page of infoWindow on clicking of previous arrow
        * @memberOf widgets/mapSettings/mapSettings
        */
        _previousInfoContent: function (featureArray, point) {
            if (!domClass.contains(query(".esriCTdivInfoLeftArrow")[0], "disableArrow")) {
                if (this.count !== 0 && this.count < featureArray.length) {
                    this.count--;
                }
                if (featureArray[this.count]) {
                    domClass.add(query(".esriCTdivInfoLeftArrow")[0], "disableArrow");
                    this._createInfoWindowContent(point, featureArray, this.count, true);
                }
            }
        },

        /**
        * create infoWindow content for selected address
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createInfoWindowContent: function (mapPoint, featureArray, count, isInfoArrowClicked) {
            var infoPopupFieldsCollection, divInfoDetailsTab, key, screenPoint, fieldLabel, urlRegex, divInfoFieldValue,
                divInfoRow, i, fieldValue, divLink, infoTitle, attributes, infoIndex, descriptionValue, objectID, fieldInfo, domainValue, isLink;
            if (featureArray[count].attr && featureArray[count].attr.attributes) {
                attributes = featureArray[count].attr.attributes;
            } else if (featureArray[count].attribute) {
                attributes = featureArray[count].attribute;
            } else {
                attributes = featureArray[count].attributes;
            }
            infoIndex = featureArray[count].layerIndex;
            if (featureArray.length > 1) {
                if (featureArray.length > 1 && count !== featureArray.length - 1) {
                    domClass.add(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                    domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count);
                } else {
                    domClass.remove(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                    domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", "");
                }
                if (count > 0 && count < featureArray.length) {
                    domClass.add(query(".esriCTdivInfoLeftArrow")[0], "esriCTShowInfoLeftArrow");
                    domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count + 1);
                } else {
                    domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "esriCTShowInfoLeftArrow");
                    domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count + 1);
                }
            } else {
                domClass.remove(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "esriCTShowInfoLeftArrow");
                domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", "");
                domAttr.set(query(".esriCTdivInfoTotalFeatureCount")[0], "innerHTML", "");
            }
            topic.publish("hideLoadingIndicatorHandler");
            divInfoDetailsTab = domConstruct.create("div", { "class": "esriCTInfoDetailsTab" }, null);
            this.divInfoDetailsContainer = domConstruct.create("div", { "class": "divInfoDetailsContainer" }, divInfoDetailsTab);
            // check feature attribute value and show NA if it is null or empty
            for (i in attributes) {
                if (attributes.hasOwnProperty(i)) {
                    if ((!attributes[i] || lang.trim(String(attributes[i])) === "") && attributes[i] !== 0) {
                        attributes[i] = appGlobals.configData.ShowNullValueAs;
                    }
                }
            }
            // check custom popup configuration
            if (appGlobals.operationalLayers[infoIndex].popupInfo && appGlobals.operationalLayers[infoIndex].popupInfo.description) {
                descriptionValue = this._getDescription(attributes, appGlobals.operationalLayers[infoIndex]);
                //create a div with pop up info description and add it to details div
                divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, this.divInfoDetailsContainer);
                domConstruct.create("div", {
                    "innerHTML": descriptionValue,
                    "class": "esriCTDisplayFieldCustomPopUp"
                }, divInfoRow);
            } else if (appGlobals.operationalLayers[infoIndex].popupInfo && appGlobals.operationalLayers[infoIndex].popupInfo.fieldInfos && appGlobals.operationalLayers[infoIndex].popupInfo.fieldInfos.length > 0) {
                urlRegex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");
                infoPopupFieldsCollection = appGlobals.operationalLayers[infoIndex].popupInfo.fieldInfos;
                for (key = 0; key < infoPopupFieldsCollection.length; key++) {
                    if (infoPopupFieldsCollection[key].visible) {
                        if (attributes.hasOwnProperty(infoPopupFieldsCollection[key].fieldName)) {
                            isLink = false;
                            divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, this.divInfoDetailsContainer);
                            fieldLabel = infoPopupFieldsCollection[key].label;
                            if (lang.trim(fieldLabel) === "") {
                                fieldLabel = infoPopupFieldsCollection[key].fieldName;
                            }
                            domConstruct.create("div", { "class": "esriCTDisplayField", "innerHTML": fieldLabel }, divInfoRow);
                            divInfoFieldValue = domConstruct.create("div", { "class": "esriCTValueField" }, divInfoRow);
                            fieldValue = attributes[infoPopupFieldsCollection[key].fieldName];
                            fieldInfo = this._isDateField(infoPopupFieldsCollection[key].fieldName, appGlobals.operationalLayers[infoIndex].layerObject);
                            if (fieldValue !== appGlobals.configData.ShowNullValueAs) {
                                if (fieldInfo) {
                                    fieldValue = this._setDateFormat(infoPopupFieldsCollection[key], fieldValue);
                                } else {
                                    fieldInfo = this._hasDomainCodedValue(infoPopupFieldsCollection[key].fieldName, attributes, appGlobals.operationalLayers[infoIndex].layerObject);
                                    if (fieldInfo) {
                                        if (fieldInfo.isTypeIdField) {
                                            fieldValue = fieldInfo.name;
                                        } else {
                                            domainValue = this._domainCodedValues(fieldInfo, fieldValue);
                                            fieldValue = domainValue.domainCodedValue;
                                        }
                                    } else if (fieldValue.toString().match(urlRegex)) {
                                        isLink = true;
                                        divLink = domConstruct.create("div", { "class": "esriCTLink", innerHTML: sharedNls.titles.moreInfo }, divInfoFieldValue);
                                        on(divLink, "click", lang.hitch(this, this._makeWindowOpenHandler(fieldValue)));
                                    } else {
                                        if (infoPopupFieldsCollection[key].format) {
                                            fieldValue = this._numberFormatCorverter(infoPopupFieldsCollection[key], fieldValue);
                                        }
                                    }
                                }
                            }
                            if (!isLink) {
                                divInfoFieldValue.innerHTML = fieldValue;
                            }
                        }
                    }
                }
            }
            try {
                infoTitle = this._popUpTitleDetails(attributes, appGlobals.operationalLayers[infoIndex]);
            } catch (ex) {
                infoTitle = appGlobals.configData.ShowNullValueAs;
            }

            //create Attachments if layer has attachments and showAttachments is set to true in pop-up configuration.
            if (appGlobals.operationalLayers[infoIndex].layerObject.hasAttachments && appGlobals.operationalLayers[infoIndex].popupInfo.showAttachments) {
                // get object id for the feature
                objectID = attributes[appGlobals.operationalLayers[infoIndex].layerObject.objectIdField];
                this._showAttachments(appGlobals.operationalLayers[infoIndex].layerObject, objectID, this.divInfoDetailsContainer);
            }
            if (!isInfoArrowClicked) {
                this.selectedMapPoint = mapPoint;
                domClass.remove(query(".esriCTdivInfoRightArrow")[0], "disableArrow");
                domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "disableArrow");
                this._centralizeInfowindowOnMap(infoTitle, divInfoDetailsTab, appGlobals.configData.InfoPopupWidth, appGlobals.configData.InfoPopupHeight);
            } else {
                screenPoint = this.map.toScreen(this.selectedMapPoint);
                screenPoint.y = this.map.height - screenPoint.y;
                domClass.remove(query(".esriCTdivInfoRightArrow")[0], "disableArrow");
                domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "disableArrow");
                topic.publish("hideProgressIndicator");
                topic.publish("setInfoWindowOnMap", infoTitle, divInfoDetailsTab, screenPoint, appGlobals.configData.InfoPopupWidth, appGlobals.configData.InfoPopupHeight);
            }
        },

        /**
        * sets the info popup header
        * @param{array} featureSet
        * @param{object} operationalLayer - operational layer data
        * @memberOf widgets/mapSettings/mapSettings
        */
        _popUpTitleDetails: function (featureSet, operationalLayer) {
            var i, j, titleField, fieldValue, domainValue, popupTitle, titleArray, headerValue, headerFieldArray, fieldInfo, popupInfoValue;
            headerValue = null;
            // split info popup header fields
            popupTitle = operationalLayer.popupInfo.title.split("{");
            headerFieldArray = [];
            // if header contains more than 1 fields
            if (popupTitle.length > 1) {
                // get strings from header
                titleField = popupTitle[0];
                for (i = 0; i < popupTitle.length; i++) {
                    // insert remaining fields in an array
                    titleArray = popupTitle[i].split("}");
                    if (i === 0) {
                        if (featureSet.hasOwnProperty(titleArray[0])) {
                            fieldValue = featureSet[titleArray[0]];
                            // concatenate string and first field from the header and insert in an array
                            headerFieldArray.push(fieldValue);
                        } else {
                            headerFieldArray.push(titleField);
                        }
                    } else {
                        for (j = 0; j < titleArray.length; j++) {
                            if (j === 0) {
                                if (featureSet.hasOwnProperty(titleArray[j])) {
                                    popupInfoValue = this._getPopupInfo(titleArray[j], operationalLayer.popupInfo);
                                    fieldValue = featureSet[lang.trim(titleArray[j])];
                                    if (fieldValue !== appGlobals.configData.ShowNullValueAs) {
                                        fieldInfo = this._isDateField(titleArray[j], operationalLayer.layerObject);
                                        if (fieldInfo) {
                                            //set date format
                                            fieldValue = this._setDateFormat(popupInfoValue, fieldValue);
                                        } else {
                                            fieldInfo = this._hasDomainCodedValue(titleArray[j], featureSet, operationalLayer.layerObject);
                                            if (fieldInfo) {
                                                if (fieldInfo.isTypeIdField) {
                                                    fieldValue = fieldInfo.name;
                                                } else {
                                                    domainValue = this._domainCodedValues(fieldInfo, fieldValue);
                                                    fieldValue = domainValue.domainCodedValue;
                                                }
                                            }
                                        }
                                        if (popupInfoValue.format) {
                                            // Check whether format for digit separator is available
                                            fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                                        }
                                    }
                                    headerFieldArray.push(fieldValue);
                                }
                            } else {
                                headerFieldArray.push(titleArray[j]);
                            }
                        }
                    }
                }

                // form a string from the headerFieldArray array, to display in header
                for (j = 0; j < headerFieldArray.length; j++) {
                    if (headerValue) {
                        headerValue = headerValue + headerFieldArray[j];
                    } else {
                        headerValue = headerFieldArray[j];
                    }
                }
            } else {
                // if popup title is not empty, display popup field headerValue else display a configurable text
                if (lang.trim(operationalLayer.popupInfo.title) !== "") {
                    headerValue = operationalLayer.popupInfo.title;
                }
            }
            if (headerValue === null) {
                headerValue = appGlobals.configData.ShowNullValueAs;
            }
            return headerValue;
        },

        /**
        * format number value based on the format received from info popup
        * @param{object} popupInfoValue
        * @param{string} fieldValue
        * @memberOf widgets/mapSettings/mapSettings
        */
        _numberFormatCorverter: function (popupInfoValue, fieldValue) {
            if (popupInfoValue.format && popupInfoValue.format.places !== null && popupInfoValue.format.places !== "" && !isNaN(parseFloat(fieldValue))) {
                // Check if digit separator is available
                if (popupInfoValue.format.digitSeparator) {
                    fieldValue = parseFloat(fieldValue).toFixed(popupInfoValue.format.places);
                    fieldValue = this._convertNumberToThousandSeperator(fieldValue);
                } else if (popupInfoValue.format.places) {
                    fieldValue = fieldValue.toFixed(popupInfoValue.format.places);
                }
            }
            return fieldValue;
        },

        /**
        * check if field type is date
        * @param{object} layerObj - layer data
        * @param{string} fieldName - current field
        * @memberOf widgets/mapSettings/mapSettings
        */
        _isDateField: function (fieldName, layerObj) {
            var i, dateField = null;
            for (i = 0; i < layerObj.fields.length; i++) {
                if (layerObj.fields[i].name === fieldName && layerObj.fields[i].type === "esriFieldTypeDate") {
                    dateField = layerObj.fields[i];
                    break;
                }
            }
            return dateField;
        },
        /**
        * format date value based on the format received from info popup
        * @param{object} dateFieldInfo
        * @param{string} dataFieldValue
        * @memberOf widgets/mapSettings/mapSettings
        */
        _setDateFormat: function (dateFieldInfo, dateFieldValue) {
            var dateObj = new Date(dateFieldValue), popupDateFormat;
            if (dateFieldInfo.format && dateFieldInfo.format.dateFormat) {
                popupDateFormat = this._getDateFormat(dateFieldInfo.format.dateFormat);
                dateFieldValue = locale.format(this.utcTimestampFromMs(dateObj), {
                    datePattern: popupDateFormat,
                    selector: "date"
                });
            } else {
                dateFieldValue = dateObj.toLocaleDateString();
            }
            return dateFieldValue;
        },

        /**
        * this function is used to convert ArcGIS date format constants to readable date formats
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getDateFormat: function (type) {
            var dateFormat;
            switch (type) {
            case "shortDate":
                dateFormat = "MM/dd/yyyy";
                break;
            case "shortDateLE":
                dateFormat = "dd/MM/yyyy";
                break;
            case "longMonthDayYear":
                dateFormat = "MMMM dd, yyyy";
                break;
            case "dayShortMonthYear":
                dateFormat = "dd MMM yyyy";
                break;
            case "longDate":
                dateFormat = "EEEE, MMMM dd, yyyy";
                break;
            case "shortDateLongTime":
                dateFormat = "MM/dd/yyyy hh:mm:ss a";
                break;
            case "shortDateLELongTime":
                dateFormat = "dd/MM/yyyy hh:mm:ss a";
                break;
            case "shortDateLELongTime24":
                dateFormat = "dd/MM/yyyy hh:mm:ss";
                break;
            case "shortDateShortTime":
                dateFormat = "MM/dd/yyyy hh:mm a";
                break;
            case "shortDateLEShortTime":
                dateFormat = "dd/MM/yyyy hh:mm a";
                break;
            case "shortDateShortTime24":
                dateFormat = "MM/dd/yyyy HH:mm";
                break;
            case "shortDateLongTime24":
                dateFormat = "MM/dd/yyyy hh:mm:ss";
                break;
            case "shortDateLEShortTime24":
                dateFormat = "dd/MM/yyyy HH:mm";
                break;
            case "longMonthYear":
                dateFormat = "MMMM yyyy";
                break;
            case "shortMonthYear":
                dateFormat = "MMM yyyy";
                break;
            case "year":
                dateFormat = "yyyy";
                break;
            default:
                dateFormat = "MMMM dd, yyyy";
            }
            return dateFormat;
        },

        /**
        * this function is used to convert number to thousand separator
        * @memberOf widgets/mapSettings/mapSettings
        */
        _convertNumberToThousandSeperator: function (number) {
            number = number.split(".");
            number[0] = number[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
            return number.join('.');
        },

        /**
        * show attached images in the issue details
        * @param{array} operationalLayer
        * @param{object} parentDiv
        * @param{string} objectID
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showAttachments: function (operationalLayer, objectID, divInfoDetailsContainer) {
            var i, divInfoRow, attchmentNode;
            // query attachments in layer
            operationalLayer.queryAttachmentInfos(objectID, lang.hitch(this, function (infos) {
                // if attachments found
                if (infos.length > 0) {
                    domConstruct.create("div", {
                        "innerHTML": sharedNls.titles.attchementText,
                        "class": "esriCTDisplayField"
                    }, divInfoDetailsContainer);
                }
                for (i = 0; i < infos.length; i++) {
                    //create a div with pop up info description and add it to details div
                    divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, divInfoDetailsContainer);
                    attchmentNode = domConstruct.create("div", {
                        "innerHTML": infos[i].name,
                        "class": "esriCTLink"
                    }, divInfoRow);
                    domClass.add(attchmentNode, "esriCTAttchmentInfo");
                    domAttr.set(attchmentNode, "imgPath", infos[i].url);
                    on(attchmentNode, "click", lang.hitch(this, this._openAttachment));
                }
            }), function (err) {
                alert(err.message);
            });
        },

        /**
        * show attachments in new window when user clicks on the attachment thumbnail
        * @param{object} evt
        * @memberOf widgets/mapSettings/mapSettings
        */
        _openAttachment: function (evt) {
            var node = evt.currentTarget || evt.srcElement, imgUrl;
            imgUrl = domAttr.get(node, "imgPath");
            window.open(imgUrl);
        },

        /**
        * open link in a window on clicking of it
        * @memberOf widgets/mapSettings/mapSettings
        */
        _makeWindowOpenHandler: function (link) {
            return function () {
                window.open(link);
            };
        },


        /**
        * get description from layer pop up info
        * @param{array} featureSet
        * @param{object} operationalLayer - operational layer data
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getDescription: function (featureSet, operationalLayerDetails) {
            var descriptionValue, i, field, splittedArrayForClosingBraces, popupInfoValue, fieldValue, fieldInfo, domainValue;
            // assuming Fields will be configure within the curly braces'{}'
            // check if Custom Configuration has any fields Configured in it.
            if (operationalLayerDetails.popupInfo.description.split("{").length > 0) {
                // add the data before 1st instance on curly '{' braces
                descriptionValue = operationalLayerDetails.popupInfo.description.split("{")[0];
                // loop through the possible number of configured fields
                for (i = 1; i < operationalLayerDetails.popupInfo.description.split("{").length; i++) {
                    // check if string is having closing curly braces '}'. i.e. it has some field
                    if (operationalLayerDetails.popupInfo.description.split("{")[i].indexOf("}") !== -1) {
                        splittedArrayForClosingBraces = operationalLayerDetails.popupInfo.description.split("{")[i].split("}");
                        field = string.substitute(splittedArrayForClosingBraces[0]);
                        popupInfoValue = this._getPopupInfo(field, operationalLayerDetails.popupInfo);

                        fieldInfo = this._isDateField(field, operationalLayerDetails.layerObject);
                        if (fieldInfo && featureSet[lang.trim(field)] !== appGlobals.configData.ShowNullValueAs) {
                            //set date format
                            fieldValue = this._setDateFormat(popupInfoValue, featureSet[lang.trim(field)]);
                            if (popupInfoValue.format) {
                                // check whether format for digit separator is available
                                fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                            }
                            descriptionValue += fieldValue;
                        } else {
                            fieldInfo = this._hasDomainCodedValue(field, featureSet, operationalLayerDetails.layerObject);
                            if (fieldInfo) {
                                if (fieldInfo.isTypeIdField) {
                                    descriptionValue += fieldInfo.name;
                                } else {
                                    domainValue = this._domainCodedValues(fieldInfo, featureSet[lang.trim(field)]);
                                    descriptionValue += domainValue.domainCodedValue;
                                }
                            } else if (featureSet[field] || featureSet[field] === 0) {
                                // check if the field is valid field or not, if it is valid then substitute its value.
                                fieldValue = featureSet[field];
                                if (popupInfoValue.format) {
                                    // check whether format for digit separator is available
                                    fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                                }
                                descriptionValue += fieldValue;
                            } else if (field === "") {
                                // if field is empty means only curly braces are configured in pop-up
                                descriptionValue += "{}";
                            }
                        }
                        splittedArrayForClosingBraces.shift();
                        // if splittedArrayForClosingBraces length is more than 1, then there are more closing braces in the string, so join the array with }
                        if (splittedArrayForClosingBraces.length > 1) {
                            descriptionValue += splittedArrayForClosingBraces.join("}");
                        } else {
                            descriptionValue += splittedArrayForClosingBraces.join("");
                        }
                    } else {
                        // if there is no closing bracket then add the rest of the string prefixed with '{' as we have split it with '{'
                        descriptionValue += "{" + operationalLayerDetails.popupInfo.description.split("{")[i];
                    }
                }
            } else {
                // no '{' braces means no field has been configured only Custom description is present in pop-up
                descriptionValue = operationalLayerDetails.popupInfo.description;
            }
            return descriptionValue;
        },

        /**
        * check if field has domain coded values
        * @param{string} fieldName
        * @param{object} feature
        * @param{object} layerObject
        * @memberOf widgets/mapSettings/mapSettings
        */
        _hasDomainCodedValue: function (fieldName, feature, layerObject) {
            var i, j, fieldInfo;
            for (i = 0; i < layerObject.fields.length; i++) {
                if (layerObject.fields[i].name === fieldName) {
                    if (layerObject.fields[i].domain && layerObject.fields[i].domain.codedValues) {
                        fieldInfo = layerObject.fields[i];
                    } else if (layerObject.typeIdField) {
                        // get types from layer object, if typeIdField is available
                        for (j = 0; j < layerObject.types.length; j++) {
                            if (String(layerObject.types[j].id) === String(feature[layerObject.typeIdField])) {
                                fieldInfo = layerObject.types[j];
                                break;
                            }
                        }
                        // if types info is found for current value of typeIdField then break the outer loop
                        if (fieldInfo) {
                            break;
                        }
                    }
                }
            }
            // get domain values from layer types object according to the value of typeIdfield
            if (fieldInfo && fieldInfo.domains) {
                if (layerObject.typeIdField && layerObject.typeIdField !== fieldName) {
                    fieldInfo.isTypeIdField = false;
                    if (fieldInfo.domains.hasOwnProperty(fieldName)) {
                        fieldInfo.domain = {};
                        fieldInfo.domain = fieldInfo.domains[fieldName];
                    } else {
                        fieldInfo = null;
                    }
                } else {
                    // set isTypeIdField to true if current field is typeIdField
                    fieldInfo.isTypeIdField = true;
                }
            }
            return fieldInfo;
        },

        /**
        * fetch domain coded value
        * @param{object} operationalLayerDetails
        * @param{string} fieldValue
        * @memberOf widgets/mapSettings/mapSettings
        */
        _domainCodedValues: function (operationalLayerDetails, fieldValue) {
            var k, codedValues, domainValueObj;
            domainValueObj = { domainCodedValue: appGlobals.configData.ShowNullValueAs };
            codedValues = operationalLayerDetails.domain.codedValues;
            if (codedValues) {
                // loop for codedValue
                for (k = 0; k < codedValues.length; k++) {
                    // check if the value is string or number
                    if (isNaN(codedValues[k].code)) {
                        // check if the fieldValue and codedValue is equal
                        if (codedValues[k].code === fieldValue) {
                            fieldValue = codedValues[k].name;
                        }
                    } else if (codedValues[k].code === parseInt(fieldValue, 10)) {
                        fieldValue = codedValues[k].name;
                    }
                }
            }
            domainValueObj.domainCodedValue = fieldValue;
            return domainValueObj;
        },

        /**
        * fetch field from popup info
        * @param{string} fieldName - current field
        * @param{object} popupInfo - operational layer popupInfo object
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getPopupInfo: function (fieldName, popupInfo) {
            var i, fieldInfo;
            for (i = 0; i < popupInfo.fieldInfos.length; i++) {
                if (popupInfo.fieldInfos[i].fieldName === fieldName) {
                    fieldInfo = popupInfo.fieldInfos[i];
                    break;
                }
            }
            return fieldInfo;
        },

        /**
        * convert the UTC time stamp from Millisecond
        * @returns Date
        * @param {object} utcMilliseconds contains UTC millisecond
        * @memberOf widgets/mapSettings/mapSettings
        */
        utcTimestampFromMs: function (utcMilliseconds) { // returns Date
            return this.localToUtc(new Date(utcMilliseconds));
        },

        /**
        * convert the local time to UTC
        * @param {object} localTimestamp contains Local time
        * @returns Date
        * @memberOf widgets/mapSettings/mapSettings
        */
        localToUtc: function (localTimestamp) { // returns Date
            return new Date(localTimestamp.getTime());
        },

        /**
        * centralizes the infoWindow on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _centralizeInfowindowOnMap: function (infoTitle, divInfoDetailsTab, infoPopupWidth, infoPopupHeight) {
            var extentChanged, screenPoint, extent, mapDefaultExtent;
            if (!appGlobals.shareOptions.isInfoPopupShared) {
                extentChanged = this.map.setExtent(this._calculateCustomMapExtent(this.selectedMapPoint));
            } else {
                extent = this._getQueryString('extent');
                if (extent !== "") {
                    mapDefaultExtent = extent.split(',');
                    mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(mapDefaultExtent[0]), "ymin": parseFloat(mapDefaultExtent[1]), "xmax": parseFloat(mapDefaultExtent[2]), "ymax": parseFloat(mapDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                    extentChanged = this.map.setExtent(mapDefaultExtent);
                }
            }
            extentChanged.then(lang.hitch(this, function () {
                topic.publish("hideProgressIndicator");
                screenPoint = this.map.toScreen(this.selectedMapPoint);
                screenPoint.y = this.map.height - screenPoint.y;
                topic.publish("setInfoWindowOnMap", infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight);
            }));
        },
        /**
        * calculate extent of map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _calculateCustomMapExtent: function (mapPoint) {
            var width, height, ratioHeight, totalYPoint, infoWindowHeight, xmin, ymin, xmax, ymax;
            width = this.map.extent.getWidth();
            height = this.map.extent.getHeight();
            ratioHeight = height / this.map.height;
            totalYPoint = appGlobals.configData.InfoPopupHeight + 30 + 61;
            infoWindowHeight = height - (ratioHeight * totalYPoint);
            xmin = mapPoint.x - (width / 2);
            ymin = mapPoint.y - infoWindowHeight;
            xmax = xmin + width;
            ymax = ymin + height;
            return new GeometryExtent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        }
    });
});
