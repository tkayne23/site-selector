/*global define,dojoConfig,alert,dijit,appGlobals */
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
    "dojo/_base/array",
    "dojo/_base/Color",
    "dojo/_base/declare",
    "dojo/_base/html",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/on",
    "dojo/query",
    "dojo/text!./templates/siteLocatorTemplate.html",
    "dojo/topic",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Select",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/request",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/tasks/BufferParameters",
    "esri/tasks/GeometryService",
    "esri/urlUtils",
    "../siteLocator/siteLocatorHelper"
], function (array, Color, declare, html, lang, dom, domAttr, domClass, domConstruct, domStyle, sharedNls, on,
    query, template, topic, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, SelectList, Graphic, Point,
    esriRequest, SimpleFillSymbol, SimpleLineSymbol, BufferParameters, GeometryService, urlUtils, siteLocatorHelper) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, siteLocatorHelper], {
        templateString: template,
        sharedNls: sharedNls,
        tooltip: null,
        logoContainer: null,
        featureGeometry: [null, null, null],
        totalArray: [],
        revenueData: [],
        employeeData: [],
        salesFinalData: [],
        employeFinalData: [],
        buldingShowOption: null,
        siteShowOption: null,
        arrTabClass: [],
        queryArrayBuildingAND: [],
        queryArrayBuildingOR: [],
        queryArraySitesAND: [],
        queryArraySitesOR: [],
        workflowCount: null,
        arrBussinesResultData: [],
        businessData: [],
        enrichData: null,
        operationalLayer: null,
        unitValues: [null, null, null, null],
        arrStudyAreas: [null, null, null],
        featureGraphics: [null, null, null, null],
        arrReportDataJson: [null, null, null, null],
        isSharedExtent: false,
        inValid: true,
        _previousAddrValue: 0,
        _previousBufferBuildingValue: 0,
        isInvalidAddress: true,

        _filters: [],

        /**
         * create Site Selector widget
         *
         * @class
         * @name widgets/siteLocator/siteLocator
         */
        postCreate: function () {
            this.andArr = [];
            this.orArr = [];
            var arrSort = [];
            this.filterOptionsValues = {};
            this.logoContainer = query(".esriControlsBR")[0];
            topic.subscribe("toggleWidget", lang.hitch(this, function (widgetID) {
                if (widgetID !== "siteLocator") {
                    /**
                     * @memberOf widgets/siteLocator/siteLocator
                     */
                    if (html.coords(this.applicationHeaderSearchContainer).h > 0) {
                        domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
                        domClass.replace(this.applicationHeaderSearchContainer, "esriCTHideContainerHeight", "esriCTShowRouteContainerHeight");
                        if (this.logoContainer) {
                            domClass.remove(this.logoContainer, "esriCTMapLogo");
                        }
                    }
                }
            }));
            urlUtils.addProxyRule({
                urlPrefix: appGlobals.configData.GeoEnrichmentService,
                proxyUrl: appGlobals.configData.ProxyUrl
            });
            appGlobals.shareOptions.arrStrAdderss = [null, null, null, null];
            appGlobals.shareOptions.arrAddressMapPoint = [null, null, null, null];
            appGlobals.shareOptions.arrBufferDistance = [null, null, null, null];
            appGlobals.shareOptions.arrWhereClause = [null, null, null, null];
            appGlobals.shareOptions.selectedObjectIndex = [null, null];
            this.domNode = domConstruct.create("div", {
                "title": sharedNls.tooltips.reports,
                "class": "esriCTHeaderSearch"
            }, null);
            this._setDefaultAddress();
            domStyle.set(this.txtAddressBuilding, "verticalAlign", "middle");
            this.txtAddressBuilding.value = domAttr.get(this.txtAddressBuilding, "defaultAddress");
            this.lastSearchStringBuilding = lang.trim(this.txtAddressBuilding.value);
            this.txtAddressSites.value = domAttr.get(this.txtAddressSites, "defaultAddress");
            this.lastSearchStringSites = lang.trim(this.txtAddressSites.value);
            this.txtAddressBusiness.value = domAttr.get(this.txtAddressBusiness, "defaultAddress");
            this.lastSearchStringBusiness = lang.trim(this.txtAddressBusiness.value);
            this.txtAddressCommunities.value = domAttr.get(this.txtAddressCommunities, "defaultAddress");
            this.lastSearchStringCommunities = lang.trim(this.txtAddressCommunities.value);
            this._showHideInfoRouteContainer();
            this._setBufferDistance();
            arrSort = this._setSelectionOption(appGlobals.configData.Workflows[2].FilterSettings.BusinesSortOptions.Option.split(","));
            arrSort.splice(0, 0, {
                "label": sharedNls.titles.select,
                "value": sharedNls.titles.select
            });
            this.selectSortOption = new SelectList({
                options: arrSort,
                id: "sortBy"
            }, this.SortBy);
            /**
             * minimize other open header panel widgets and show search
             */
            dom.byId("esriCTParentDivContainer").appendChild(this.applicationHeaderSearchContainer);
            this._setTabVisibility();
            this._attachLocatorEvents({
                divSearch: this.divSearchBuilding,
                checkBox: null,
                imgSearchLoader: this.imgSearchLoaderBuilding,
                txtAddress: this.txtAddressBuilding,
                close: this.closeBuilding,
                divAddressResults: this.divAddressResultsBuilding,
                divAddressScrollContainer: this.divAddressScrollContainerBuilding,
                divAddressScrollContent: this.divAddressScrollContentBuilding,
                addressWorkflowCount: 0,
                searchContent: this.searchContentBuilding,
                lastSearchString: this.lastSearchStringBuilding
            });
            this._attachLocatorEvents({
                divSearch: this.divSearchSites,
                checkBox: null,
                imgSearchLoader: this.imgSearchLoaderSites,
                txtAddress: this.txtAddressSites,
                close: this.closeSites,
                divAddressResults: this.divAddressResultsSites,
                divAddressScrollContainer: this.divAddressScrollContainerSites,
                divAddressScrollContent: this.divAddressScrollContentSites,
                addressWorkflowCount: 1,
                searchContent: this.searchContentSites,
                lastSearchString: this.lastSearchStringSites
            });
            this._attachLocatorEvents({
                divSearch: this.divSearchBusiness,
                checkBox: {
                    checked: true
                },
                imgSearchLoader: this.imgSearchLoaderBusiness,
                txtAddress: this.txtAddressBusiness,
                close: this.closeBusiness,
                divAddressResults: this.divAddressResultsBusiness,
                divAddressScrollContainer: this.divAddressScrollContainerBusiness,
                divAddressScrollContent: this.divAddressScrollContentBusiness,
                addressWorkflowCount: 2,
                searchContent: this.searchContentBusiness,
                lastSearchString: this.lastSearchStringBusiness
            });
            this._attachLocatorEvents({
                divSearch: this.divSearchCommunities,
                checkBox: this.rdoCommunitiesAddressSearch,
                imgSearchLoader: this.imgSearchLoaderCommunities,
                txtAddress: this.txtAddressCommunities,
                close: this.closeCommunities,
                divAddressResults: this.divAddressResultsCommunities,
                divAddressScrollContainer: this.divAddressScrollContainerCommunities,
                divAddressScrollContent: this.divAddressScrollContentCommunities,
                addressWorkflowCount: 3,
                searchContent: this.searchContentCommunities,
                lastSearchString: this.lastSearchStringCommunities
            });

            this._setInnerHtmlStrings();

            this.own(on(this.domNode, "click", lang.hitch(this, function () {
                topic.publish("toggleWidget", "siteLocator");
                domStyle.set(this.applicationHeaderSearchContainer, "display", "block");
                this._showHideInfoRouteContainer();
            })));

            if (this.logoContainer) {
                domClass.add(this.logoContainer, "esriCTMapLogo");
            }

            this.own(on(this.esriCTsearchContainerBuilding, "click", lang.hitch(this, function () {
                this._showTab(this.esriCTsearchContainerBuilding, this.searchContentBuilding);
            })));

            this.own(on(this.esriCTsearchContainerSites, "click", lang.hitch(this, function () {
                this._showTab(this.esriCTsearchContainerSites, this.searchContentSites);
            })));

            this.own(on(this.esriCTsearchContainerBusiness, "click", lang.hitch(this, function () {
                this._showTab(this.esriCTsearchContainerBusiness, this.searchContentBusiness);
            })));

            this.own(on(this.esriCTsearchContainerCommunities, "click", lang.hitch(this, function () {
                this._showTab(this.esriCTsearchContainerCommunities, this.searchContentCommunities);
            })));

            this._showBusinessTab();

            if (appGlobals.configData.Workflows[3].Enabled) {
                this._searchCommunitySelectNames();
            }

            this.own(on(this.ResultBusinessTab, "click", lang.hitch(this, function () {
                this._showBusinessTab();
            })));

            this.own(on(this.resultDemographicTab, "click", lang.hitch(this, function () {
                this._showDemographicInfoTab();
            })));
            this.own(on(this.selectSortOption, "change", lang.hitch(this, function (value) {
                if (value.toLowerCase() !== sharedNls.titles.select.toLowerCase()) {
                    this._selectionChangeForSort(value);
                }
            })));

            this.own(on(this.rdoCommunityPlaceName, "click", lang.hitch(this, function () {
                this._toggleCommunitySearch();
            })));

            this.own(on(this.rdoCommunitiesAddressSearch, "click", lang.hitch(this, function () {
                this._communitiesSearchRadioButtonHandler(this.rdoCommunitiesAddressSearch);
            })));

            // extent change event for map
            this.map.on("extent-change", lang.hitch(this, function () {
                if (this.map.getLayer("esriFeatureGraphicsLayer").graphics[0]) {
                    if (this.operationalLayer && this.operationalLayer.visibleAtMapScale &&
                        this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].attributes.layerURL === this.operationalLayer.url) {
                        this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].show();
                    }
                    else {
                        this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].hide();
                    }
                }
            }));

            this._checkSharedParameters();

            // attach all filter click for building, sites and business tab
            this._attachFilterClick();

            // dynamic UI of Building tab
            if (appGlobals.configData.Workflows[0].SearchSettings[0].FilterSettings.FilterRangeFields.length ||
                appGlobals.configData.Workflows[0].SearchSettings[0].FilterSettings.RegularFilterOptionFields.length ||
                appGlobals.configData.Workflows[0].SearchSettings[0].FilterSettings.AdditionalFilterOptions.FilterOptions.length) {

                this._createFilterOption(0, this.horizantalruleBuliding,
                    appGlobals.configData.Workflows[0].SearchSettings[0].FilterSettings.RegularFilterOptionFields,
                    appGlobals.configData.Workflows[0].SearchSettings[0].FilterSettings.FilterRangeFields,
                    appGlobals.configData.Workflows[0].SearchSettings[0].FilterSettings.AdditionalFilterOptions
                );

                this.own(on(this.filterText, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.filterText, "esriCTFilterTextEnable")) {
                        if (domStyle.get(this.filterContainer, "display") === "none") {
                            domStyle.set(this.filterContainer, "display", "block");
                            domClass.remove(this.filterMainContainer, "esriCTFilterMainContainer");
                        }
                        else {
                            domStyle.set(this.filterContainer, "display", "none");
                            domClass.add(this.filterMainContainer, "esriCTFilterMainContainer");
                        }
                    }
                })));
            }
            else {
                domStyle.set(this.filterMainContainer, "display", "none");
            }

            // dynamic UI of Sites tab
            if (appGlobals.configData.Workflows[1].SearchSettings[0].FilterSettings.FilterRangeFields.length ||
                appGlobals.configData.Workflows[1].SearchSettings[0].FilterSettings.RegularFilterOptionFields.length ||
                appGlobals.configData.Workflows[1].SearchSettings[0].FilterSettings.AdditionalFilterOptions.FilterOptions.length) {

                this._createFilterOption(1, this.horizantalruleSites,
                    appGlobals.configData.Workflows[1].SearchSettings[0].FilterSettings.RegularFilterOptionFields,
                    appGlobals.configData.Workflows[1].SearchSettings[0].FilterSettings.FilterRangeFields,
                    appGlobals.configData.Workflows[1].SearchSettings[0].FilterSettings.AdditionalFilterOptions
                );

                this.own(on(this.filterTextSites, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.filterTextSites, "esriCTFilterTextEnable")) {
                        if (domStyle.get(this.filterContainerSites, "display") === "none") {
                            domStyle.set(this.filterContainerSites, "display", "block");
                            domClass.remove(this.filterMainContainerSites, "esriCTFilterMainContainer");
                        }
                        else {
                            domStyle.set(this.filterContainerSites, "display", "none");
                            domClass.add(this.filterMainContainerSites, "esriCTFilterMainContainer");
                        }
                    }
                })));
            }
            else {
                domStyle.set(this.filterMainContainerSites, "display", "none");
            }

            // dynamic UI of Business tab
            if (appGlobals.configData.Workflows[2].FilterSettings.FilterRangeFields.length) {

                this._createFilterOption(2, this.BussinessFromToMainDiv,
                    null,
                    appGlobals.configData.Workflows[2].FilterSettings.FilterRangeFields,
                    null
                );

                this.own(on(this.filterTextBusiness, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.filterTextBusiness, "esriCTFilterTextEnable")) {
                        if (domStyle.get(this.filterContainerBussiness, "display") === "none") {
                            domStyle.set(this.filterContainerBussiness, "display", "block");
                            domClass.remove(this.filterMainContainerBussiness, "esriCTFilterMainContainer");
                        }
                        else {
                            domStyle.set(this.filterContainerBussiness, "display", "none");
                            domStyle.set(this.filterContainer, "display", "none");
                            domClass.add(this.filterContainerBussiness, "esriCTFilterMainContainer");
                            domClass.add(this.filterMainContainerBussiness, "esriCTFilterMainContainer");
                        }
                    }
                })));
            }
            else {
                domStyle.set(this.filterMainContainerBussiness, "display", "none");
            }
            //event handler to resize attachment images when window gets resized
            on(window, "resize", lang.hitch(this, this._resizeImages));
        },

        /**
         * set element content in all workflows
         * @memberOf widgets/siteLocator/siteLocator
         */
        _setInnerHtmlStrings: function () {
            domAttr.set(this.imgSearchLoaderBuilding, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            domStyle.set(this.divAddressScrollContainerBuilding, "display", "none");
            domStyle.set(this.divAddressScrollContentBuilding, "display", "none");
            domAttr.set(this.imgSearchLoaderSites, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            domStyle.set(this.divAddressScrollContainerSites, "display", "none");
            domStyle.set(this.divAddressScrollContentSites, "display", "none");
            domAttr.set(this.imgSearchLoaderBusiness, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            domStyle.set(this.divAddressScrollContainerBusiness, "display", "none");
            domStyle.set(this.divAddressScrollContentBusiness, "display", "none");
            domAttr.set(this.imgSearchLoaderCommunities, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            domAttr.set(this.buildingContent, "innerHTML", appGlobals.configData.Workflows[0].Name);
            domAttr.set(this.buildingContent, "title", appGlobals.configData.Workflows[0].Name);
            domAttr.set(this.sitesContent, "innerHTML", appGlobals.configData.Workflows[1].Name);
            domAttr.set(this.sitesContent, "title", appGlobals.configData.Workflows[1].Name);
            domAttr.set(this.businessContent, "innerHTML", appGlobals.configData.Workflows[2].Name);
            domAttr.set(this.businessContent, "title", appGlobals.configData.Workflows[2].Name);
            domAttr.set(this.communitiesContent, "innerHTML", appGlobals.configData.Workflows[3].Name);
            domAttr.set(this.communitiesContent, "title", appGlobals.configData.Workflows[3].Name);
            domAttr.set(this.searchBuildingText, "innerHTML", sharedNls.titles.searchBuildingText);
            domAttr.set(this.closeBuilding, "title", sharedNls.tooltips.clearEntry);
            domAttr.set(this.esriCTimgLocateBuilding, "title", sharedNls.tooltips.search);
            domAttr.set(this.searchSiteText, "innerHTML", sharedNls.titles.searchSiteText);
            domAttr.set(this.closeSites, "title", sharedNls.tooltips.clearEntry);
            domAttr.set(this.esriCTimgLocateSites, "title", sharedNls.tooltips.search);
            domAttr.set(this.searchBusinessText, "innerHTML", sharedNls.titles.searchBusinessText);
            domAttr.set(this.closeBusiness, "title", sharedNls.tooltips.clearEntry);
            domAttr.set(this.esriCTimgLocateBusiness, "title", sharedNls.tooltips.search);
            domAttr.set(this.communityText, "innerHTML", sharedNls.titles.communityText);
            domAttr.set(this.closeCommunities, "title", sharedNls.tooltips.clearEntry);
            domAttr.set(this.esriCTimgLocateCommunities, "title", sharedNls.tooltips.search);
            domAttr.set(this.searchCommunityText, "innerHTML", sharedNls.titles.searchCommunityText);
            domStyle.set(this.divAddressScrollContainerCommunities, "display", "none");
            domStyle.set(this.divAddressScrollContentCommunities, "display", "none");
            domAttr.set(this.filterText, "innerHTML", sharedNls.titles.filterText);
            domAttr.set(this.filterTextSites, "innerHTML", sharedNls.titles.filterText);
            domAttr.set(this.filterTextBusiness, "innerHTML", sharedNls.titles.filterText);
            domAttr.set(this.filterIcon, "title", sharedNls.tooltips.applyFilter);
            domAttr.set(this.clearFilterBuilding, "title", sharedNls.tooltips.clearFilter);
            domAttr.set(this.filterIconSites, "title", sharedNls.tooltips.applyFilter);
            domAttr.set(this.clearFilterSites, "title", sharedNls.tooltips.clearFilter);
            domAttr.set(this.filterIconBusiness, "title", sharedNls.tooltips.applyFilter);
            domAttr.set(this.clearFilterBusiness, "title", sharedNls.tooltips.clearFilter);
        },

        /**
         * set buffer distance in all workflows and create horizontal slider for different workflows
         * @memberOf widgets/siteLocator/siteLocator
         */
        _setBufferDistance: function () {
            var bufferDistance = null;
            // check the shared URL for "bufferDistance" to create buffer on map
            if (window.location.toString().split("$bufferDistance=").length > 1) {
                bufferDistance = Number(window.location.toString().split("$bufferDistance=")[1].toString().split("$")[0]);
            }
            // check the shared URL for "workflowCount" and workflowCount is equal to 0 and set the buffer distance for buildings tab
            if (window.location.toString().split("$workflowCount=").length > 1 &&
                Number(window.location.toString().split("$workflowCount=")[1].split("$")[0]) === 0) {
                this._createHorizontalSlider(this.horizontalSliderContainerBuliding,
                    this.horizontalRuleContainer, this.sliderDisplayText, 0, bufferDistance);
                appGlobals.shareOptions.arrBufferDistance[0] = bufferDistance;
            }
            else {
                this._createHorizontalSlider(this.horizontalSliderContainerBuliding,
                    this.horizontalRuleContainer, this.sliderDisplayText, 0, null);
            }
            // check the shared URL for "workflowCount" and workflowCount is equal to 1 and set the buffer distance for sites tab
            if (window.location.toString().split("$workflowCount=").length > 1 &&
                Number(window.location.toString().split("$workflowCount=")[1].split("$")[0]) === 1) {
                this._createHorizontalSlider(this.horizontalSliderContainerSites,
                    this.horizontalRuleContainerSites, this.sitesSliderText, 1, bufferDistance);
                appGlobals.shareOptions.arrBufferDistance[1] = bufferDistance;
            }
            else {
                this._createHorizontalSlider(this.horizontalSliderContainerSites,
                    this.horizontalRuleContainerSites, this.sitesSliderText, 1, null);
            }
            // check the shared URL for "workflowCount" and workflowCount is equal to 2 and set the buffer distance for business tab
            if (window.location.toString().split("$workflowCount=").length > 1 &&
                Number(window.location.toString().split("$workflowCount=")[1].split("$")[0]) === 2) {
                this._createHorizontalSlider(this.horizontalSliderContainerBusiness,
                    this.horizontalRuleContainerBusiness, this.businessSliderText, 2, bufferDistance);
                appGlobals.shareOptions.arrBufferDistance[2] = bufferDistance;
            }
            else {
                this._createHorizontalSlider(this.horizontalSliderContainerBusiness,
                    this.horizontalRuleContainerBusiness, this.businessSliderText, 2, null);
            }
        },

        /**
         * set default address for search in all workflows
         * @memberOf widgets/siteLocator/siteLocator
         */
        _setDefaultAddress: function () {
            var sharedAddress, sharedWorkFlow;
            // check the shared URL for "address" and "workflowCount" and set the address in address search
            if (window.location.toString().split("$address=").length > 1 && window.location.toString().split("$workflowCount=").length > 1) {
                sharedAddress = decodeURIComponent(decodeURIComponent(window.location.toString().split("$address=")[1].split("$")[0].toString()));
                sharedWorkFlow = Number(window.location.toString().split("$workflowCount=")[1].split("$")[0]);
                appGlobals.shareOptions.arrStrAdderss[sharedWorkFlow] = sharedAddress;
            }
            if (sharedWorkFlow === 0 && sharedAddress) {
                domAttr.set(this.txtAddressBuilding, "defaultAddress", sharedAddress);
            }
            else {
                this._setDefaultTextboxValue(this.txtAddressBuilding);
            }
            if (sharedWorkFlow === 1 && sharedAddress) {
                domAttr.set(this.txtAddressSites, "defaultAddress", sharedAddress);
            }
            else {
                this._setDefaultTextboxValue(this.txtAddressSites);
            }
            if (sharedWorkFlow === 2 && sharedAddress) {
                domAttr.set(this.txtAddressBusiness, "defaultAddress", sharedAddress);
            }
            else {
                this._setDefaultTextboxValue(this.txtAddressBusiness);
            }
            if (sharedWorkFlow === 3 && sharedAddress) {
                domAttr.set(this.txtAddressCommunities, "defaultAddress", sharedAddress);
            }
            else {
                domAttr.set(this.txtAddressCommunities, "defaultAddress",
                    appGlobals.configData.Workflows[3].FilterSettings.StandardGeographyQuery.LocatorDefaultAddress);
            }
        },

        /**
         * check the shared parameters in app URL
         * @memberOf widgets/siteLocator/siteLocator
         */
        _checkSharedParameters: function () {
            var timeOut, mapPoint, standerdGeoAttribute;
            // check the shared URL for "addressMapPoint" to perform address search
            if (window.location.toString().split("$addressMapPoint=").length > 1) {
                mapPoint = new Point(window.location.toString().split("$addressMapPoint=")[1].split("$")[0].split(",")[0], window.location.toString().split("$addressMapPoint=")[1].split("$")[0].split(",")[1], this.map.spatialReference);
                clearTimeout(timeOut);
                timeOut = setTimeout(lang.hitch(this, function () {
                    if (this.workflowCount === 3) {
                        topic.publish("geoLocation-Complete", mapPoint);
                    }
                    else {
                        this.isSharedExtent = true;
                        this._locateAddressOnMap(mapPoint, null, true);
                    }
                }, 500));
            }
            // check the shared URL for "strGeoLocationMapPoint" to perform geolocation
            if (window.location.toString().split("$strGeoLocationMapPoint=").length > 1) {
                mapPoint = new Point(window.location.toString().split("$strGeoLocationMapPoint=")[1].split("$")[0].split(",")[0], window.location.toString().split("$strGeoLocationMapPoint=")[1].split("$")[0].split(",")[1], this.map.spatialReference);
                appGlobals.shareOptions.strGeoLocationMapPoint = window.location.toString().split("$strGeoLocationMapPoint=")[1].split("$")[0];
                this.addPushPin(mapPoint);
            }
            // check the shared URL for "standardGeoQueryAttribute" to perform  standard geographic query(for defining area or location) in communities tab
            if (window.location.toString().split("$standardGeoQueryAttribute=").length > 1) {
                standerdGeoAttribute = {};
                standerdGeoAttribute.attributes = {
                    CountryAbbr: window.location.toString().split("$standardGeoQueryAttribute=")[1].split("$")[0].split(",")[0],
                    DataLayerID: window.location.toString().split("$standardGeoQueryAttribute=")[1].split("$")[0].split(",")[1],
                    AreaID: window.location.toString().split("$standardGeoQueryAttribute=")[1].split("$")[0].split(",")[2]
                };
                clearTimeout(timeOut);
                timeOut = setTimeout(lang.hitch(this, function () {
                    topic.publish("showProgressIndicator");
                    this.isSharedExtent = true;
                    this._enrichData(null, this.workflowCount, standerdGeoAttribute);
                }, 500));
            }
            // check the shared URL for "communitySelectionFeature" for setting communities tab control to disable or enable
            if (window.location.toString().split("$communitySelectionFeature=").length > 1) {
                clearTimeout(timeOut);
                timeOut = setTimeout(lang.hitch(this, function () {
                    this.isSharedExtent = true;
                    topic.publish("showProgressIndicator");
                    this.rdoCommunityPlaceName.checked = true;
                    domClass.add(this.divSearchCommunities, "esriCTDisabledAddressColorChange");
                    domClass.add(this.txtAddressCommunities, "esriCTDisabledAddressColorChange");
                    domClass.add(this.closeCommunities, "esriCTDisabledAddressColorChange");
                    domClass.add(this.clearhideCommunities, "esriCTDisabledAddressColorChange");
                    this.txtAddressCommunities.disabled = true;
                    this.closeCommunities.disabled = true;
                    this.divSearchCommunities.disabled = true;
                    this.divSearchCommunities.disabled = true;
                    domConstruct.empty(this.divAddressResultsCommunities);
                    domStyle.set(this.divAddressScrollContainerCommunities, "display", "none");
                    domStyle.set(this.divAddressScrollContentCommunities, "display", "none");
                }, 500));
            }
        },

        /**
         * enable/disable community search
         * @memberOf widgets/siteLocator/siteLocator
         */
        _toggleCommunitySearch: function () {
            domClass.add(this.divSearchCommunities, "esriCTDisabledAddressColorChange");
            domClass.add(this.txtAddressCommunities, "esriCTDisabledAddressColorChange");
            domClass.add(this.closeCommunities, "esriCTDisabledAddressColorChange");
            domClass.add(this.clearhideCommunities, "esriCTDisabledAddressColorChange");
            this.txtAddressCommunities.disabled = this.rdoCommunityPlaceName.checked;
            this.closeCommunities.disabled = this.rdoCommunityPlaceName.checked;
            this.divSearchCommunities.disabled = this.rdoCommunityPlaceName.checked;
            this.divSearchCommunities.disabled = this.rdoCommunityPlaceName.checked;
            domConstruct.empty(this.divAddressResultsCommunities);
            domStyle.set(this.divAddressScrollContainerCommunities, "display", "none");
            domStyle.set(this.divAddressScrollContentCommunities, "display", "none");
            domClass.add(this.divAddressResultsCommunities, "esriCTDisableSearch");
            this.comAreaList.disabled = !this.rdoCommunityPlaceName.checked;
            appGlobals.shareOptions.standardGeoQueryAttribute = null;
        },

        /**
         * create UI(dynamic) of filter option field in buildings, sites and business tab based on config parameter
         * @param {number} index -- workflow index
         * @param {object} containerDiv -- container node
         * @param {array} regOptionFields -- RegularFilterOptionFields fields
         * @param {array} rangeFields -- FilterRangeFields fields
         * @param {array} addlOptionFields -- AdditionalFilterOptions fields
         * @memberOf widgets/siteLocator/siteLocator
         */
        _createFilterOption: function (index, containerDiv, regOptionFields, rangeFields, addlOptionFields) {
            var i, j, divFilterOption, divFilterOptionPart, fieldName, divFromToBlock, inputId,
                checkbox, fromInput, toInput, alternates;

            // Create UI for FilterRangeFields
            if (rangeFields) {
                for (i = 0; i < rangeFields.length; i++) {

                    // Container for option
                    divFilterOption = domConstruct.create("div", {
                        "class": "esriFilterOption"
                    }, containerDiv);

                    // Option
                    divFilterOptionPart = domConstruct.create("div", {}, divFilterOption);

                    fieldName = rangeFields[i].FieldName || rangeFields[i].VariableNameSuffix;
                    inputId = fieldName + index + i;
                    checkbox = this._createOption(divFilterOptionPart,
                        inputId,
                        rangeFields[i].DisplayText,
                        fieldName);

                    // Range
                    divFilterOptionPart = domConstruct.create("div", {
                        "class": "esriFilterOptionRange"
                    }, divFilterOption);

                    divFromToBlock = domConstruct.create("div", {
                        "class": "esriFilterOptionRangeBlock"
                    }, divFilterOptionPart);

                    domConstruct.create("label", {
                        "class": "esriFilterOptionRangeLabel",
                        "for": inputId + "from",
                        "innerHTML": sharedNls.titles.fromText
                    }, divFromToBlock);

                    fromInput = domConstruct.create("input", {
                        "type": "number",
                        "class": "esriFilterOptionRangeInput",
                        "id": inputId + "from",
                        "maxlength": "20"
                    }, divFromToBlock);

                    divFromToBlock = domConstruct.create("div", {
                        "class": "esriFilterOptionRangeBlock"
                    }, divFilterOptionPart);

                    domConstruct.create("label", {
                        "class": "esriFilterOptionRangeLabel",
                        "for": inputId + "to",
                        "innerHTML": sharedNls.titles.toText
                    }, divFromToBlock);

                    toInput = domConstruct.create("input", {
                        "type": "number",
                        "class": "esriFilterOptionRangeInput",
                        "id": inputId + "to",
                        "maxlength": "20"
                    }, divFromToBlock);

                    // Update checkbox to know about its range inputs
                    checkbox.value = {
                        "from": fromInput,
                        "to": toInput
                    };

                    // Monitor input changes
                    this.own(on(fromInput, "input", lang.hitch(this, this._updateFilterability)));
                    this.own(on(toInput, "input", lang.hitch(this, this._updateFilterability)));

                    // Add option to object's list of filters
                    this._filters.push(checkbox);
                }
            }

            // Create UI for RegularFilterOptionFields
            if (regOptionFields) {
                for (i = 0; i < regOptionFields.length; i++) {

                    // Container for option/option set
                    divFilterOption = domConstruct.create("div", {
                        "class": "esriFilterOption"
                    }, containerDiv);

                    // Set of options
                    if (regOptionFields[i].Options) {
                        // Create set of options
                        alternates = [];
                        for (j = 0; j < regOptionFields[i].Options.length; j++) {
                            divFilterOptionPart = domConstruct.create("div", {
                                "class": "esriFilterOptionHalfContainer"
                            }, divFilterOption);

                            checkbox = this._createOption(divFilterOptionPart,
                                regOptionFields[i].FieldName.toString() + index.toString() + i,
                                regOptionFields[i].Options[j].DisplayText,
                                regOptionFields[i].FieldName.toString(), regOptionFields[i].Options[j].FieldValue);

                            // Add option to collection
                            alternates.push(checkbox);
                        }

                        // Add collection to object's list of filters
                        this._filters.push(alternates);
                    }

                    // Single option
                    else {
                        checkbox = this._createOption(divFilterOption,
                            regOptionFields[i].FieldName.toString() + index.toString() + i,
                            regOptionFields[i].DisplayText,
                            regOptionFields[i].FieldName.toString(), regOptionFields[i].FieldValue);

                        // Add option to object's list of filters
                        this._filters.push(checkbox);
                    }
                }
            }

            // Provide UI for AdditionalFilterOptions for backwards compatibility; they're added as a set of options
            // to the RegularFilterOptionFields
            if (addlOptionFields && addlOptionFields.Enabled && addlOptionFields.FilterOptions.length) {

                // Container for option/option set
                divFilterOption = domConstruct.create("div", {
                    "class": "esriFilterOption"
                }, containerDiv);

                // create additional filter options UI(dynamic) for configurable fields in buildings and sites tab
                alternates = [];
                for (i = 0; i < addlOptionFields.FilterOptions.length; i++) {
                    divFilterOptionPart = domConstruct.create("div", {
                        "class": "esriFilterOptionHalfContainer"
                    }, divFilterOption);

                    checkbox = this._createOption(divFilterOptionPart,
                        addlOptionFields.FilterFieldName.toString() + index.toString() + i,
                        addlOptionFields.FilterOptions[i].DisplayText,
                        addlOptionFields.FilterFieldName.toString(),
                        addlOptionFields.FilterOptions[i].FieldValue.toString());

                    // Add option to collection
                    alternates.push(checkbox);
                }

                // Add collection to object's list of filters
                this._filters.push(alternates);
            }
        },

        /**
         * Creates an option checkbox.
         * @param {object} containerDiv -- container node
         * @param {string} id -- id for checkbox
         * @param {string} displayText -- label for checkbox
         * @param {string} fieldName -- field tied to checkbox
         * @param {!object} fieldValue -- value tied to checkbox option
         * @return {object} created checkbox
         */
        _createOption: function (containerDiv, id, displayText, fieldName, fieldValue) {
            var checkboxWithText, checkbox, adjustedFieldValue = fieldValue;

            if (typeof adjustedFieldValue === "string") {
                // Insert single quote(') as an escape character to allow single quote(') in query string
                adjustedFieldValue = adjustedFieldValue.replace(/'/g, "''");
            }

            // Box containing checkbox and label
            checkboxWithText = domConstruct.create("div", {
                "class": "esriCheckBoxWithText"
            }, containerDiv);

            // Checkbox
            checkbox = domConstruct.create("div", {
                "class": "esriCheckBox",
                "id": id,
                "name": fieldName,
                "value": adjustedFieldValue,
                "role": "checkbox",
                "aria-checked": "false"
            }, checkboxWithText);

            // Label
            domConstruct.create("label", {
                "class": "esriCheckBoxLabel",
                "for": id,
                "innerHTML": displayText
            }, checkboxWithText);

            /*
            nodeValue = arrFields[i].DisplayText + index;
            this.filterOptionsValues[nodeValue] = {
                "checkBox": checkBox,
                "workflow": index
            };
            */

            // Toggle checkbox
            this.own(on(checkboxWithText, "click", lang.hitch(this, this._updateCheckbox)));

            return checkbox;
        },

        _updateCheckbox: function (evt) {
            var checkbox = evt.currentTarget.childNodes[0];

            // Toggle checkbox
            if (domClass.contains(checkbox, "esriCheckBoxChecked")) {
                domClass.remove(checkbox, "esriCheckBoxChecked");
                domAttr.set(checkbox, "aria-checked", "false");
            }
            else {
                domClass.add(checkbox, "esriCheckBoxChecked");
                domAttr.set(checkbox, "aria-checked", "true");
            }

            // Update apply and clear filter buttons based on if we have any options checked
            this._updateFilterability();
        },

        _updateFilterability: function () {
            var i, nl, value, hasOptions = true;

            // Update apply and clear filter buttons based on if we have any options checked
            nl = query(".esriCheckBoxChecked");
            hasOptions = nl.length > 0;

            // Check that range values are defined
            for (i = 0; i < nl.length; ++i) {
                value = nl[i].value;
                if (typeof value === "object") {
                    hasOptions = hasOptions && value.from && !isNaN(value.from.valueAsNumber) &&
                        value.to && !isNaN(value.to.valueAsNumber);
                    if (hasOptions) {
                        hasOptions = hasOptions && value.from.valueAsNumber <= value.to.valueAsNumber;
                    }
                }
            }
            console.log("Number of options: " + nl.length + "; ok to filter: " + hasOptions.toString());
        },

        /**
         * check whether the check box is clicked in buildings, sites and business tab
         * @memberOf widgets/siteLocator/siteLocator
         */
        _onCheckBoxClicked: function (evt) {
            //when checkBox is deselected
            if (!evt.currentTarget.checked) {
                //check if no filter option is selected
                if (this._validateFilterOptions()) {
                    switch (this.workflowCount) {
                        //disable the filter icon
                        case 0:
                            domClass.remove(this.filterIcon, "esriCTFilterEnabled");
                            if (domClass.contains(this.clearFilterBuilding, "esriCTClearFilterIconEnable")) {
                                domClass.remove(this.clearFilterBuilding, "esriCTClearFilterIconEnable");
                                topic.publish("showProgressIndicator");
                                this.queryArrayBuildingOR = [];
                                this.queryArrayBuildingAND = [];
                                if (this.selectedValue[this.workflowCount] && this.selectBusinessSortForBuilding) {
                                    this.selectedValue[this.workflowCount] = null;
                                    appGlobals.shareOptions.sortingData = null;
                                    this.selectBusinessSortForBuilding.set("value", sharedNls.titles.select);
                                }
                                // clear filter query string and retained the buffer results for building tab
                                this._clearFilter();
                            }
                            else {
                                this._clearFilterCheckBoxes();
                            }
                            break;
                        case 1:
                            domClass.remove(this.filterIconSites, "esriCTFilterEnabled");
                            if (domClass.contains(this.clearFilterSites, "esriCTClearFilterIconEnable")) {
                                domClass.remove(this.clearFilterSites, "esriCTClearFilterIconEnable");
                                topic.publish("showProgressIndicator");
                                this.queryArraySitesAND = [];
                                this.queryArraySitesOR = [];
                                if (this.selectedValue[this.workflowCount] && this.selectBusinessSortForSites) {
                                    this.selectedValue[this.workflowCount] = null;
                                    appGlobals.shareOptions.sortingData = null;
                                    this.selectBusinessSortForSites.set("value", sharedNls.titles.select);
                                }
                                // clear filter query string and retained the buffer results for sites tab
                                this._clearFilter();
                            }
                            else {
                                this._clearFilterCheckBoxes();
                            }
                            break;
                        case 2:
                            domClass.remove(this.filterIconBusiness, "esriCTFilterEnabled");
                            if (domClass.contains(this.clearFilterBusiness, "esriCTClearFilterIconEnable")) {
                                domClass.remove(this.clearFilterBusiness, "esriCTClearFilterIconEnable");
                                appGlobals.shareOptions.toFromBussinessFilter = null;
                                this._clearFilterCheckBoxes();
                                if (this.selectedValue[this.workflowCount] && this.selectSortOption) {
                                    this.selectedValue[this.workflowCount] = null;
                                    appGlobals.shareOptions.sortingData = null;
                                    this.selectSortOption.set("value", sharedNls.titles.select);
                                }
                                // clear filtered results and retained the buffer results for business tab
                                this._resetBusinessBufferValueResult();
                            }
                            else {
                                this._clearFilterCheckBoxes();
                            }
                            break;
                    }
                }
                else {
                    if (this.filterOptionsValues[evt.currentTarget.value]) {
                        this.filterOptionsValues[evt.currentTarget.value].txtFrom.disabled = true;
                        this.filterOptionsValues[evt.currentTarget.value].txtFrom.value = "";
                        this.filterOptionsValues[evt.currentTarget.value].txtTo.disabled = true;
                        this.filterOptionsValues[evt.currentTarget.value].txtTo.value = "";
                    }
                }
            }
            else {
                //when checkBox is selected and invalid
                if (this.filterOptionsValues[evt.currentTarget.value]) {
                    this.filterOptionsValues[evt.currentTarget.value].txtFrom.disabled = !evt.currentTarget.checked;
                    this.filterOptionsValues[evt.currentTarget.value].txtTo.disabled = !evt.currentTarget.checked;
                }
                switch (this.workflowCount) {
                    //enable the filter icon
                    case 0:
                        domClass.add(this.filterIcon, "esriCTFilterEnabled");
                        break;
                    case 1:
                        domClass.add(this.filterIconSites, "esriCTFilterEnabled");
                        break;
                    case 2:
                        domClass.add(this.filterIconBusiness, "esriCTFilterEnabled");
                        break;
                }
            }
        },

        /**
         * validate if no filter option is selected for Building, Sites, Business tab
         * @memberOf widgets/siteLocator/siteLocator
         */
        _validateFilterOptions: function () {
            var noFilterSelected = true,
                node;
            for (node in this.filterOptionsValues) {
                if (this.filterOptionsValues.hasOwnProperty(node)) {
                    if (this.filterOptionsValues[node].checkBox.checked && this.filterOptionsValues[node].workflow === this.workflowCount) {
                        noFilterSelected = false;
                        break;
                    }
                }
            }
            return noFilterSelected;
        },

        /**
         * show the filtered data in buildings, sites and business tab
         * @memberOf widgets/siteLocator/siteLocator
         */
        _attachFilterClick: function () {
            topic.publish("showProgressIndicator");
            // attach filter click on building tab
            if (this.filterIcon) {
                on(this.filterIcon, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.filterIcon, "esriCTFilterEnabled")) {
                        topic.publish("showProgressIndicator");
                        domClass.add(this.clearFilterBuilding, "esriCTClearFilterIconEnable");
                        this.queryArrayBuildingOR = [];
                        this.queryArrayBuildingAND = [];
                        this.andArr = [];
                        this.orArr = [];
                        //set drop down value as "select" in building tab
                        if (this.selectBusinessSortForBuilding) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectBusinessSortForBuilding.set("value", sharedNls.titles.select);
                        }
                        this._applyFilterForBuildingAndSites();
                    }
                }));

                // clear filter icon click clear all filter values and get the buffer result of building tab
                this.own(on(this.clearFilterBuilding, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.clearFilterBuilding, "esriCTClearFilterIconEnable")) {
                        topic.publish("showProgressIndicator");
                        this.queryArrayBuildingOR = [];
                        this.queryArrayBuildingAND = [];
                        if (this.selectBusinessSortForBuilding) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectBusinessSortForBuilding.set("value", sharedNls.titles.select);
                        }
                        this._clearFilter();
                        domClass.remove(this.filterIcon, "esriCTFilterEnabled");
                        domClass.remove(this.clearFilterBuilding, "esriCTClearFilterIconEnable");
                    }
                })));
            }
            // attach filter click on sites tab
            if (this.filterIconSites) {
                on(this.filterIconSites, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.filterIconSites, "esriCTFilterEnabled")) {
                        topic.publish("showProgressIndicator");
                        domClass.add(this.clearFilterSites, "esriCTClearFilterIconEnable");
                        this.andArr = [];
                        this.orArr = [];
                        this.queryArraySitesAND = [];
                        this.queryArraySitesOR = [];
                        //set drop down value as "select" in sites tab
                        if (this.selectBusinessSortForSites) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectBusinessSortForSites.set("value", sharedNls.titles.select);
                        }
                        this._applyFilterForBuildingAndSites();
                    }
                }));

                // clear filter icon click clear all filter values and get the buffer result of sites tab
                this.own(on(this.clearFilterSites, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.clearFilterSites, "esriCTClearFilterIconEnable")) {
                        topic.publish("showProgressIndicator");
                        this.queryArraySitesAND = [];
                        this.queryArraySitesOR = [];
                        if (this.selectBusinessSortForSites) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectBusinessSortForSites.set("value", sharedNls.titles.select);
                        }
                        this._clearFilter();
                        domClass.remove(this.filterIconSites, "esriCTFilterEnabled");
                        domClass.remove(this.clearFilterSites, "esriCTClearFilterIconEnable");

                    }
                })));
            }
            // attach filter click on business tab
            if (this.filterIconBusiness) {
                on(this.filterIconBusiness, "click", lang.hitch(this, function () {
                    var node;
                    if (domClass.contains(this.filterIconBusiness, "esriCTFilterEnabled")) {
                        topic.publish("showProgressIndicator");
                        //set drop down value as "select" in bussiness tab
                        if (this.selectSortOption) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectSortOption.set("value", sharedNls.titles.select);
                        }
                        for (node in this.filterOptionsValues) {
                            if (this.filterOptionsValues.hasOwnProperty(node)) {
                                if (this.filterOptionsValues[node].txtFrom && !this.filterOptionsValues[node].txtFrom.disabled) {
                                    this._fromToDatachangeHandler();
                                    break;
                                }
                            }
                        }
                    }
                }));
                // clear filter icon click clear all filter values and get the buffer result of business tab
                this.own(on(this.clearFilterBusiness, "click", lang.hitch(this, function () {
                    if (domClass.contains(this.clearFilterBusiness, "esriCTClearFilterIconEnable")) {
                        topic.publish("showProgressIndicator");
                        if (this.selectSortOption) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectSortOption.set("value", sharedNls.titles.select);
                        }
                        this._resetBusinessBufferValueResult();
                        this._clearFilterCheckBoxes();
                        domClass.remove(this.filterIconBusiness, "esriCTFilterEnabled");
                        domClass.remove(this.clearFilterBusiness, "esriCTClearFilterIconEnable");
                        appGlobals.shareOptions.toFromBussinessFilter = null;
                    }
                })));
            }
        },

        /**
         * clear filter function to remove all checkbox and get the buffer result in buildings, sites tab
         * @memberOf widgets/siteLocator/siteLocator
         */
        _clearFilter: function () {
            this.andArr = [];
            this.orArr = [];
            this._clearFilterCheckBoxes();
            this._callAndOrQuery(this.andArr, this.orArr);
        },

        /**
         * clear selected filter checkBox in buildings, sites and business tab
         * @memberOf widgets/siteLocator/siteLocator
         */
        _clearFilterCheckBoxes: function () {
            var node;
            for (node in this.filterOptionsValues) {
                if (this.filterOptionsValues.hasOwnProperty(node)) {
                    if (this.filterOptionsValues[node].workflow === this.workflowCount) {
                        if (this.filterOptionsValues[node].txtFrom && this.filterOptionsValues[node].txtTo) {
                            // clear and disable the to and from text box values
                            this.filterOptionsValues[node].txtFrom.value = "";
                            this.filterOptionsValues[node].txtTo.value = "";
                            this.filterOptionsValues[node].txtFrom.disabled = true;
                            this.filterOptionsValues[node].txtTo.disabled = true;
                        }
                        this.filterOptionsValues[node].checkBox.checked = false;
                    }
                }
            }
        },

        /**
         * validate range filter values in building, sites and business tab and return the boolean value
         * @memberOf widgets/siteLocator/siteLocator
         */
        _validateRangeFilterValues: function () {
            var isValid;
            isValid = true;
            /*
            for (node in this.filterOptionsValues) {
                if (this.filterOptionsValues.hasOwnProperty(node)) {
                    if (isValid) {
                        if (this.filterOptionsValues[node].workflow === this.workflowCount && this.filterOptionsValues[node].checkBox.checked) {
                            if (this.filterOptionsValues[node].txtFrom && this.filterOptionsValues[node].txtTo) {
                                // validate from and to text box value
                                isValid = this._fromToQuery(this.filterOptionsValues[node].txtFrom,
                                    this.filterOptionsValues[node].txtTo, this.filterOptionsValues[node].checkBox);
                                if (!isValid) {
                                    break;
                                }
                            }
                        }
                    }

                }
            }*/
            return isValid;
        },

        /**
         * check the check box state and valid filters in building and sites tab and get filtered data
         * @memberOf widgets/siteLocator/siteLocator
         */
        _applyFilterForBuildingAndSites: function (bufferDistance) {
            var isValid;
            isValid = true;
            this.andArr = [];
            this.orArr = [];
            /*for (node in this.filterOptionsValues) {
                if (this.filterOptionsValues.hasOwnProperty(node)) {
                    if (isValid) {
                        if (this.filterOptionsValues[node].workflow === this.workflowCount && this.filterOptionsValues[node].checkBox.checked) {
                            if (this.filterOptionsValues[node].txtFrom && this.filterOptionsValues[node].txtTo) {
                                isValid = this._fromToQuery(this.filterOptionsValues[node].txtFrom,
                                    this.filterOptionsValues[node].txtTo, this.filterOptionsValues[node].checkBox);
                                // if to and from values is invalid then clear values of from and to textbox of selected workflows
                                if (!isValid) {
                                    for (node in this.filterOptionsValues) {
                                        if (this.filterOptionsValues.hasOwnProperty(node)) {
                                            if (this.filterOptionsValues[node].workflow === this.workflowCount) {
                                                if (this.filterOptionsValues[node].txtFrom && this.filterOptionsValues[node].txtTo) {
                                                    this.filterOptionsValues[node].txtFrom.value = "";
                                                    this.filterOptionsValues[node].txtTo.value = "";
                                                }
                                            }
                                        }
                                    }
                                    topic.publish("hideProgressIndicator");
                                    break;
                                }
                            }
                            else {
                                this.chkQueryHandler(this.filterOptionsValues[node].checkBox);
                            }
                        }
                    }
                }
            }*/
            if (isValid) {
                this._callAndOrQuery(this.andArr, this.orArr);
            }
            else {
                alert(sharedNls.errorMessages.invalidInput);
            }
        },

        /**
         * handler for geometry query in communities tab
         * @param {object} feature set(features)
         * @memberOf widgets/siteLocator/siteLocator
         */
        _geometryForSelectedArea: function (featureSet) {
            var i, arrPolygon = [],
                geometryService;
            geometryService = new GeometryService(appGlobals.configData.GeometryService.toString());
            // loop all features and store the geometry in array
            for (i = 0; i < featureSet.features.length; i++) {
                arrPolygon.push(featureSet.features[i].geometry);
            }
            // union of input geometries and call enrichData handler for communities tab and get the demographic data
            geometryService.union(arrPolygon, lang.hitch(this, function (geometry) {
                this._enrichData([geometry], 3, null);
            }), lang.hitch(this, function () {
                topic.publish("hideProgressIndicator");
            }));
        },

        /**
         * drop down list for county name in communities tab(geometry provided by feature from layer)
         * @memberOf widgets/siteLocator/siteLocator
         */
        _searchCommunitySelectNames: function () {
            var queryCommunityNames, layer, queryString, currentTime = new Date().getTime();
            if (appGlobals.configData.Workflows[3].FilterSettings.FilterLayer.LayerURL) {
                layer = this.getCurrentOperationalLayer(3);
                queryString = currentTime + "=" + currentTime;
                //set where clause to honor definition expression configured in webmap
                if (layer && layer.webmapDefinitionExpression) {
                    queryString += " AND " + layer.webmapDefinitionExpression;
                }
                // use esriRequest method and service parameter to retrieve data from a web server.
                queryCommunityNames = esriRequest({
                    url: appGlobals.configData.Workflows[3].FilterSettings.FilterLayer.LayerURL + "/query",
                    content: {
                        f: "pjson",
                        where: queryString,
                        returnGeometry: false,
                        returnDistinctValues: true,
                        outFields: appGlobals.configData.Workflows[3].FilterSettings.FilterLayer.FilterFieldName
                    }
                });
                // success handler for communities county field
                queryCommunityNames.then(lang.hitch(this, this._showResultsearchCommunitySelectNames));
            }
            else {
                domStyle.set(this.divDropDownSearch, "display", "none");
            }
        },

        /**
         * create data provider for drop down in business tab
         * @param {array} list of available record for business tab
         * @memberOf widgets/siteLocator/siteLocator
         */
        _setSelectionOption: function (arrOption) {
            var k, arrOpt = [];
            // loop all array element and store it in array as key value
            for (k = 0; k < arrOption.length; k++) {
                if (arrOption.hasOwnProperty(k)) {
                    arrOpt.push({
                        "label": arrOption[k],
                        "value": arrOption[k]
                    });
                }
            }
            return arrOpt;
        },

        /**
         * selection change event handler for business sort options for business tab
         * @param {object} selected object
         * @memberOf widgets/siteLocator/siteLocator
         */
        _selectionChangeForSort: function (value) {
            appGlobals.shareOptions.sortingData = value;
            this.selectedValue[this.workflowCount] = value;
            if (this.currentBussinessData) {
                this.currentBussinessData.sort(lang.hitch(this, function (a, b) {
                    // a greater than b
                    if (a[value] > b[value]) {
                        return 1;
                    }
                    // a less than b
                    if (a[value] < b[value]) {
                        return -1;
                    }
                    // a must be equal to b
                    if (a[value] !== 0 && b[value] !== 0) {
                        return 0;
                    }
                }));
            }
            this.isSharedSort = true;
            this._setBusinessValues(this.currentBussinessData, this.mainResultDiv, this.enrichData);
        },

        /**
         * create buffer based on specified geometry
         * @param {object} input geometry to be used to create buffer
         * @memberOf widgets/siteLocator/siteLocator
         */
        _createBuffer: function (geometry, bufferDistance, isValidAddressSelected) {
            var sliderDistance, slider, selectedPanel, geometryService, params, businessTab, DemoInfoTab, isValid;
            topic.publish("showProgressIndicator");
            appGlobals.shareOptions.arrAddressMapPoint[this.workflowCount] = geometry.x + "," + geometry.y;
            if (document.activeElement) {
                document.activeElement.blur();
            }
            isValid = this._validateRangeFilterValues();
            if (isValid) {
                appGlobals.shareOptions.arrBufferDistance[this.workflowCount] = bufferDistance;
                this.featureGeometry[this.workflowCount] = geometry;
                selectedPanel = query(".esriCTsearchContainerSitesSelected")[0];
                // set slider values for various workflows
                if (domClass.contains(selectedPanel, "esriCTsearchContainerBuilding")) {
                    slider = dijit.byId("sliderhorizontalSliderContainerBuliding");
                    sliderDistance = slider.value;
                }
                else if (domClass.contains(selectedPanel, "esriCTsearchContainerSites")) {
                    slider = dijit.byId("sliderhorizontalSliderContainerSites");
                    sliderDistance = slider.value;
                }
                else if (domClass.contains(selectedPanel, "esriCTsearchContainerBusiness")) {
                    slider = dijit.byId("sliderhorizontalSliderContainerBusiness");
                    sliderDistance = slider.value;
                }
                geometryService = new GeometryService(appGlobals.configData.GeometryService);
                if (sliderDistance && Math.round(sliderDistance) !== 0) {
                    if (geometry && geometry.type === "point") {
                        //setup the buffer parameters
                        params = new BufferParameters();
                        params.distances = [Math.round(sliderDistance)];
                        params.bufferSpatialReference = this.map.spatialReference;
                        params.outSpatialReference = this.map.spatialReference;
                        params.geometries = [this.featureGeometry[this.workflowCount]];
                        params.unit = GeometryService[this.unitValues[this.workflowCount]];
                        geometryService.buffer(params, lang.hitch(this, function (geometries) {
                            this.lastGeometry[this.workflowCount] = geometries;
                            //reset sort value on buffer change
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            // for business tab clear all scrollbar and call enrich data handler
                            if (this.workflowCount === 2) {
                                this.revenueData = [];
                                this.employeeData = [];
                                businessTab = domClass.contains(this.ResultBusinessTab, "esriCTBusinessInfoTabSelected");
                                DemoInfoTab = domClass.contains(this.resultDemographicTab, "esriCTDemographicInfoTabSelected");
                                if (businessTab && DemoInfoTab) {
                                    domClass.remove(this.resultDemographicTab, "esriCTReportTab");
                                    domClass.remove(this.ResultBusinessTab, "esriCTAreaOfInterestTab");
                                }
                                else if (!businessTab) {
                                    domClass.remove(this.resultDemographicTab, "esriCTReportTab");
                                    domClass.add(this.ResultBusinessTab, "esriCTBusinessInfoTabSelected");
                                }
                                this._enrichData(geometries, this.workflowCount, null);
                            }
                            else {
                                this._applyFilterForBuildingAndSites(bufferDistance);
                            }
                        }));
                    }
                    else {
                        topic.publish("hideProgressIndicator");
                    }
                }
                else {
                    topic.publish("hideProgressIndicator");
                    if (document.activeElement) {
                        document.activeElement.blur();
                    }
                    // clear buildings, sites and business tab data
                    if (this.workflowCount === 0) {
                        domStyle.set(this.outerDivForPegination, "display", "none");
                        domConstruct.empty(this.outerResultContainerBuilding);
                        domConstruct.empty(this.attachmentOuterDiv);
                        delete this.buildingTabData;
                    }
                    else if (this.workflowCount === 1) {
                        domStyle.set(this.outerDivForPeginationSites, "display", "none");
                        domConstruct.empty(this.outerResultContainerSites);
                        domConstruct.empty(this.attachmentOuterDivSites);
                        delete this.sitesTabData;
                    }
                    else if (this.workflowCount === 2) {
                        this._clearBusinessData();
                    }
                    this.lastGeometry[this.workflowCount] = null;
                    this.map.graphics.clear();
                    this.map.getLayer("esriBufferGraphicsLayer").clear();
                    alert(sharedNls.errorMessages.bufferSliderValue);
                    this.isSharedExtent = false;
                }
            }
            else {
                if (isValidAddressSelected) {
                    alert(sharedNls.errorMessages.invalidInput);
                    if (this.workflowCount === 0 || this.workflowCount === 1 || this.workflowCount === 2) {
                        this.clearTextValuesOfFilters();
                    }
                }
                if (this.workflowCount === 2) {
                    if (domClass.contains(this.filterIconBusiness, "esriCTFilterEnabled")) {
                        domClass.add(this.clearFilterBusiness, "esriCTClearFilterIconEnable");
                    }
                }
                this._sliderCollection[this.workflowCount].slider.setValue(appGlobals.shareOptions.arrBufferDistance[this.workflowCount]);
                domAttr.set(this._sliderCollection[this.workflowCount].divSliderValue, "innerHTML", Math.round(this._sliderCollection[this.workflowCount].slider.value).toString() + " " + appGlobals.configData.DistanceUnitSettings.DistanceUnitName);
                topic.publish("hideProgressIndicator");
                this.sliderReset = true;
            }
        },

        /**
         * draw geometry shape on the map
         * @param {array} geometry to be shown on map
         * @memberOf widgets/siteLocator/siteLocator
         */
        showBuffer: function (bufferedGeometries) {
            var symbol, self = this;
            this.map.getLayer("esriBufferGraphicsLayer").clear();
            // set the simple fill symbol parameter
            symbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([parseInt(appGlobals.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(appGlobals.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(appGlobals.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(appGlobals.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]),
                    2
                ),
                new Color([parseInt(appGlobals.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(appGlobals.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(appGlobals.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(appGlobals.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)])
            );
            // add buffer graphic layer on map
            array.forEach(bufferedGeometries, function (geometry) {
                var graphic = new Graphic(geometry, symbol);
                self.map.getLayer("esriBufferGraphicsLayer").add(graphic);
            });
            if (!this.isSharedExtent && bufferedGeometries) {
                this.map.setExtent(bufferedGeometries[0].getExtent(), true);
            }
            this.isSharedExtent = false;
        }
    });
});
