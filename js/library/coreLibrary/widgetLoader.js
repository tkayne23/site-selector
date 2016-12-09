/*global define,require,alert,appGlobals */
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
    "dijit/_WidgetBase",
    "widgets/mapSettings/mapSettings",
    "widgets/appHeader/appHeader",
    "widgets/splashScreen/splashScreen",
    "dojo/_base/array",
    "dojo/dom-attr",
    "dojo/dom",
    "dojo/_base/lang",
    "dojo/Deferred",
    "esri/request",
    "esri/arcgis/utils",
    "dojo/promise/all",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/topic",
    "dojo/domReady!"
], function (declare, _WidgetBase, Map, AppHeader, SplashScreen, array, domAttr, dom, lang, Deferred, esriRequest, esriUtils, all, sharedNls, topic) {

    //========================================================================================================================//

    return declare([_WidgetBase], {
        sharedNls: sharedNls,

        /**
         * load widgets specified in Header Widget Settings of configuration file
         *
         * @class
         * @name coreLibrary/widgetLoader
         */
        startup: function () {
            var mapInstance, splashScreen, basemapDeferred;
            topic.subscribe("filterRedundantBasemap", lang.hitch(this, function (bmLayers) {
                this._removeWorkFlowBasemap();
                this._filterRedundantBasemap(bmLayers, appGlobals.configData.BaseMapLayers, true);
            }));
            basemapDeferred = new Deferred();
            this._fetchBasemapCollection(basemapDeferred);
            basemapDeferred.then(lang.hitch(this, function (baseMapLayers) {
                appGlobals.configData.BaseMapLayers = baseMapLayers;
                if (appGlobals.configData.SplashScreen && appGlobals.configData.SplashScreen.IsVisible && window.location.toString().split("extent=").length <= 1) {
                    splashScreen = new SplashScreen();
                    splashScreen.showSplashScreenDialog();
                }
                appGlobals.configData.BaseMapLayers = baseMapLayers;
                mapInstance = this._initializeMap();

                /**
                 * create an object with widgets specified in Header Widget Settings of configuration file
                 * @param {array} appGlobals.configData.AppHeaderWidgets Widgets specified in configuration file
                 */
                topic.subscribe("setMap", lang.hitch(this, function (map) {
                    this._initializeWidget(map);
                }));
                this._applicationThemeLoader();
                if (!appGlobals.configData.WebMapId && lang.trim(appGlobals.configData.WebMapId).length === 0) {
                    this._initializeWidget(mapInstance);
                }
            }));
        },

        /**
         * create map object
         * @return {object} Current map instance
         * @memberOf coreLibrary/widgetLoader
         */
        _initializeMap: function () {
            var map = new Map(),
                mapInstance = map._getMapInstance();
            return mapInstance;
        },

        _initializeWidget: function (mapInstance) {
            var widgets = {},
                deferredArray = [];

            array.forEach(appGlobals.configData.AppHeaderWidgets, function (widgetConfig) {
                var deferred = new Deferred();
                widgets[widgetConfig.WidgetPath] = null;
                require([widgetConfig.WidgetPath], function (Widget) {
                    widgets[widgetConfig.WidgetPath] = new Widget({
                        map: mapInstance
                    });
                    deferred.resolve(widgetConfig.WidgetPath);
                });
                deferredArray.push(deferred.promise);
            });

            all(deferredArray).then(lang.hitch(this, function () {
                try {
                    /**
                     * create application header
                     */
                    this._createApplicationHeader(widgets);
                }
                catch (ex) {
                    alert(sharedNls.errorMessages.widgetNotLoaded);
                }

            }));
        },

        /**
         * create application header
         * @param {object} widgets Contain widgets to be displayed in header panel
         * @memberOf coreLibrary/widgetLoader
         */
        _createApplicationHeader: function (widgets) {
            var applicationHeader = new AppHeader();
            applicationHeader.loadHeaderWidgets(widgets);
        },

        _applicationThemeLoader: function () {
            if (appGlobals.configData.ThemeColor) {
                if (dom.byId("theme")) {
                    domAttr.set(dom.byId("theme"), "href", appGlobals.configData.ThemeColor);
                }
            }
        },

        _fetchBasemapCollection: function (basemapDeferred) {
            var groupUrl, searchUrl, webmapRequest, groupRequest, deferred, thumbnailSrc, baseMapArray = [],
                deferredArray = [],
                self = this,
                basemapId;
            /**
             * If group owner & title are configured, create request to fetch the group id
             */
            if (appGlobals.configData.BasemapGroupTitle && appGlobals.configData.BasemapGroupOwner) {
                if (lang.trim(appGlobals.configData.PortalAPIURL) !== "") {
                    groupUrl = appGlobals.configData.PortalAPIURL + "community/groups?q=title:\"" + appGlobals.configData.BasemapGroupTitle + "\" AND owner:" + appGlobals.configData.BasemapGroupOwner + "&f=json";
                    groupRequest = esriRequest({
                        url: groupUrl,
                        callbackParamName: "callback"
                    });
                    groupRequest.then(function (groupInfo) {
                        if (groupInfo.results.length === 0) {
                            basemapDeferred.resolve(baseMapArray);
                            return;
                        }
                        /**
                         * Create request using group id to fetch all the items from that group
                         */
                        searchUrl = appGlobals.configData.PortalAPIURL + "search?q=group:" + groupInfo.results[0].id + "&sortField=name&sortOrder=desc&num=50&f=json";
                        webmapRequest = esriRequest({
                            url: searchUrl,
                            callbackParamName: "callback"
                        });
                        webmapRequest.then(function (groupInfo) {
                            /**
                             * Loop for each item in the group
                             */
                            array.forEach(groupInfo.results, lang.hitch(this, function (info, index) {
                                /**
                                 * If type is "Map Service", create the object and push it into "baseMapArray"
                                 */
                                if (info.type === "Map Service") {
                                    thumbnailSrc = (groupInfo.results[index].thumbnail === null) ? appGlobals.configData.NoThumbnail : appGlobals.configData.PortalAPIURL + "content/items/" + info.id + "/info/" + info.thumbnail;
                                    basemapId = groupInfo.results[index].name || groupInfo.results[index].id;

                                    baseMapArray.push({
                                        BasemapId: basemapId,
                                        ThumbnailSource: thumbnailSrc,
                                        Name: info.title,
                                        MapURL: info.url
                                    });
                                    /**
                                     * If type is "Web Map", create requests to fetch all the items of the webmap (asynchronous request)
                                     */
                                }
                                else if (info.type === "Web Map") {
                                    var mapDeferred = esriUtils.getItem(info.id);
                                    mapDeferred.then(lang.hitch(this, function () {
                                        deferred = new Deferred();
                                        deferred.resolve();
                                    }));
                                    deferredArray.push(mapDeferred);
                                }
                            }));
                            if (deferredArray.length > 0) {

                                all(deferredArray).then(function (res) {
                                    /**
                                     *If result of webmaps are empty
                                     */
                                    if (res.length === 0) {
                                        basemapDeferred.resolve(baseMapArray);
                                        return;
                                    }
                                    /**
                                     * Else for each items in the webmap, create the object and push it into "baseMapArray"
                                     */
                                    array.forEach(res, function (data) {
                                        self._filterRedundantBasemap(data, baseMapArray, false);
                                    });
                                    basemapDeferred.resolve(baseMapArray);
                                });
                            }
                            else {
                                basemapDeferred.resolve(baseMapArray);
                            }
                        }, function (err) {
                            alert(err.message);
                        });
                    }, function (err) {
                        alert(err.message);
                    });
                }
                else {
                    alert(sharedNls.errorMessages.portalUrlNotFound);
                }
            }
            else {
                basemapDeferred.resolve(baseMapArray);
            }
        },

        /**
         * remove basemap which is added by earlier selected workflow's webmap
         * @memberOf coreLibrary/widgetLoader
         */
        _removeWorkFlowBasemap: function () {
            var i, temBaseMapArray = [],
                baseMapArray = appGlobals.configData.BaseMapLayers;
            for (i = 0; i < baseMapArray.length; i++) {
                if (baseMapArray[i].length) {
                    if (!baseMapArray[i][0].isWorkFlowBasemap) {
                        temBaseMapArray.push(baseMapArray[i]);
                    }
                }
                else {
                    if (!baseMapArray[i].isWorkFlowBasemap) {
                        temBaseMapArray.push(baseMapArray[i]);
                    }
                }
            }
            appGlobals.configData.BaseMapLayers = temBaseMapArray;
        },

        /**
         * If basemap layer is already present in the "baseMapArray", skip it
         * @memberOf coreLibrary/widgetLoader
         */
        _filterRedundantBasemap: function (bmLayers, baseMapArray, isWorkFlowBasemap) {
            var i, bmLayerData, multiBasemap = [];
            if (bmLayers.itemData.baseMap) {
                if (bmLayers.itemData.baseMap.baseMapLayers) {
                    bmLayerData = bmLayers.itemData.baseMap.baseMapLayers;
                }
                else {
                    bmLayerData = [];
                    bmLayerData.push(bmLayers);
                }
                //check if basemap is an open street map
                if (bmLayerData[0].layerType === "OpenStreetMap" || bmLayerData[0].type === "OpenStreetMap") {
                    if (!bmLayerData[0].id) {
                        //set default id for basemap
                        bmLayerData[0].id = "defaultBasemapId";
                    }
                    bmLayerData[0].url = bmLayerData[0].id;
                }
                if (this._isUniqueBasemap(baseMapArray, bmLayerData)) {
                    if (isWorkFlowBasemap || bmLayerData[0].visibility) {
                        appGlobals.shareOptions.selectedBasemapIndex = baseMapArray.length;
                    }
                    if (bmLayerData.length === 1) {
                        this._setBasemapAttribute(baseMapArray, bmLayerData[0], bmLayers, isWorkFlowBasemap);
                    }
                    else if (bmLayerData.length > 1) {
                        for (i = 0; i < bmLayerData.length; i++) {
                            this._setBasemapAttribute(multiBasemap, bmLayerData[i], bmLayers, isWorkFlowBasemap);
                        }
                        baseMapArray.push(multiBasemap);
                    }
                }
            }
        },

        /**
         * set required basemap attribute
         * @memberOf coreLibrary/widgetLoader
         */
        _setBasemapAttribute: function (baseMapArray, bmLayerData, bmLayers, isWorkFlowBasemap) {
            bmLayerData.isWorkFlowBasemap = isWorkFlowBasemap;
            bmLayerData.basemapId = bmLayerData.id;
            bmLayerData.id = bmLayers.item.id;
            bmLayerData.thumbnail = bmLayers.item.thumbnail;
            bmLayerData.title = bmLayers.itemData.baseMap.title;
            this._storeUniqueBasemap(bmLayerData, baseMapArray);
        },

        /**
         * check new basemap exists in basemap array or not
         * @memberOf coreLibrary/widgetLoader
         */
        _isUniqueBasemap: function (baseMapArray, bmLayerData) {
            var i, j, k, pushBasemap = true,
                count = 1;
            for (i = 0; i < baseMapArray.length; i++) {
                if (!baseMapArray[i].length) {
                    if (bmLayerData[0].url === baseMapArray[i].MapURL) {
                        if (bmLayerData.length > 1) {
                            pushBasemap = true;
                        }
                        else {
                            pushBasemap = false;
                        }
                        if (bmLayerData[0].visibility) {
                            appGlobals.shareOptions.selectedBasemapIndex = i;
                        }
                        break;
                    }
                }
                else {
                    for (j = 0; j < baseMapArray[i].length; j++) {
                        if (bmLayerData[0].url === baseMapArray[i][j].MapURL) {
                            for (k = 1; k < bmLayerData.length; k++) {
                                if (bmLayerData[k].url === baseMapArray[i][j].MapURL) {
                                    count++;
                                }
                            }
                            if (bmLayerData[0].visibility) {
                                appGlobals.shareOptions.selectedBasemapIndex = i;
                            }
                            break;
                        }
                    }
                    if (baseMapArray.length - 1 === i) {
                        if (count === baseMapArray[i].length) {
                            pushBasemap = false;
                        }
                        else {
                            pushBasemap = true;
                        }
                    }
                }
            }
            return pushBasemap;
        },

        /**
         * store unique base map
         * @memberOf coreLibrary/widgetLoader
         */
        _storeUniqueBasemap: function (bmLayer, baseMapArray) {
            var thumbnailSrc, layerType;
            if (bmLayer.url || (bmLayer.layerType === "OpenStreetMap" || bmLayer.type === "OpenStreetMap")) {
                thumbnailSrc = (bmLayer.thumbnail === null) ? appGlobals.configData.NoThumbnail : appGlobals.configData.PortalAPIURL + "content/items/" + bmLayer.id + "/info/" + bmLayer.thumbnail;
                if (bmLayer.layerType) {
                    layerType = bmLayer.layerType;
                }
                else {
                    layerType = bmLayer.type;
                }
                baseMapArray.push({
                    BasemapId: bmLayer.basemapId,
                    ThumbnailSource: thumbnailSrc,
                    Name: bmLayer.title,
                    MapURL: bmLayer.url,
                    isWorkFlowBasemap: bmLayer.isWorkFlowBasemap,
                    layerType: layerType
                });
            }
        }
    });
});
