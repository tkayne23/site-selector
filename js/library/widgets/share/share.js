/*global define,dojo,esri,alert, appGlobals */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/** @license
| Version 10.2
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
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/on",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/shareTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/topic",
    "esri/request",
    "widgets/share/commonShare"
], function (declare, domConstruct, lang, domAttr, on, dom, query, domClass, domGeom, domStyle, string, html, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, topic, esriRequest, commonShare) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,

        /**
        * create share widget
        *
        * @class
        * @name widgets/share/share
        */
        postCreate: function () {
            var applicationHeaderDiv;

            /**
            * close share panel if any other widget is opened
            * @param {string} widget Key of the newly opened widget
            */
            topic.subscribe("toggleWidget", lang.hitch(this, function (widgetID) {
                if (widgetID !== "share") {

                    /**
                    * divAppContainer Sharing Options Container
                    * @member {div} divAppContainer
                    * @private
                    * @memberOf widgets/share/share
                    */
                    if (html.coords(this.divAppContainer).h > 0) {
                        domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                        domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                    }
                } else {
                    if (domClass.contains(this.divAppContainer, "esriCTHideContainerHeight")) {
                        this._setShareContainerHeight();
                    }
                }
                topic.publish("closeDialogBox");
            }));
            this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.share, "class": "esriCTHeaderIcons esriCTImgSocialMedia" }, null);
            this.own(on(this.domNode, "click", lang.hitch(this, function () {

                /**
                * minimize other open header panel widgets and show share panel
                */
                topic.publish("toggleWidget", "share");
                topic.publish("setMaxLegendLength");
                this._showHideShareContainer();
                this._shareLink();
            })));
            applicationHeaderDiv = domConstruct.create("div", { "class": "esriCTApplicationShareicon" }, dom.byId("esriCTParentDivContainer"));
            applicationHeaderDiv.appendChild(this.divAppContainer);

            on(this.imgEmbedding, "click", lang.hitch(this, function () {
                this._showEmbeddingContainer();
            }));
            on(window, "resize", lang.hitch(this, function () {
                var height = domGeom.getMarginBox(this.divShareCodeContainer).h + domGeom.getMarginBox(this.divShareCodeContent).h;
                this._setShareContainerHeight(height);
            }));
            //send request when fb, mail or twitter icon is clicked for sharing
            on(this.divFacebook, "click", lang.hitch(this, function () { this._share("facebook"); }));
            on(this.divTwitter, "click", lang.hitch(this, function () { this._share("twitter"); }));
            on(this.divMail, "click", lang.hitch(this, function () { this._share("email"); }));

        },

        _showEmbeddingContainer: function () {
            var height;
            if (domGeom.getMarginBox(this.divShareContainer).h > 1) {
                domClass.add(this.divShareContainer, "esriCTShareBorder");
                domClass.replace(this.divShareContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            } else {
                height = domGeom.getMarginBox(this.divShareCodeContainer).h + domGeom.getMarginBox(this.divShareCodeContent).h;
                domClass.remove(this.divShareContainer, "esriCTShareBorder");
                domClass.replace(this.divShareContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domStyle.set(this.divShareContainer, "height", height + 'px');
            }
            this._setShareContainerHeight(height);
        },

        _setShareContainerHeight: function (embContainerHeight) {
            var contHeight = domStyle.get(this.divAppHolder, "height");
            if (domClass.contains(this.divShareContainer, "esriCTShowContainerHeight")) {
                if (embContainerHeight) {
                    contHeight += embContainerHeight;
                } else {
                    contHeight += domStyle.get(this.divShareContainer, "height");
                }
            }
            //adding 2px in height of share container to display border
            domStyle.set(this.divAppContainer, "height", (contHeight + 2) + "px");
        },
        /* show and hide share container
        * @memberOf widgets/share/share
        */
        _showHideShareContainer: function () {
            if (html.coords(this.divAppContainer).h > 0) {
                /**
                * when user clicks on share icon in header panel, close the sharing panel if it is open
                */
                domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            } else {
                /**
                * when user clicks on share icon in header panel, open the sharing panel if it is closed
                */
                domClass.replace(this.domNode, "esriCTImgSocialMediaSelected", "esriCTImgSocialMedia");
                domClass.replace(this.divAppContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
            }
        },

        /**
        * return current map extent
        * @return {string} Current map extent
        * @memberOf widgets/share/share
        */
        _getMapExtent: function () {
            var extents = Math.round(this.map.extent.xmin).toString() + "," + Math.round(this.map.extent.ymin).toString() + "," + Math.round(this.map.extent.xmax).toString() + "," + Math.round(this.map.extent.ymax).toString();
            return extents;
        },

        /**
        * display sharing panel
        * @param {array} appGlobals.configData.MapSharingOptions Sharing option settings specified in configuration file
        * @memberOf widgets/share/share
        */
        _shareLink: function () {
            var mapExtent, url, urlStr;

            /**
            * get current map extent to be shared
            */
            if (domGeom.getMarginBox(this.divShareContainer).h <= 1) {
                domClass.add(this.divShareContainer, "esriCTShareBorder");
            }
            this.divShareCodeContent.value = "<iframe width='100%' height='100%' src='" + location.href + "'></iframe> ";
            domAttr.set(this.divShareCodeContainer, "innerHTML", sharedNls.titles.webpageDisplayText);
            mapExtent = this._getMapExtent();
            url = esri.urlToObject(window.location.toString());
            urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$workflowCount=" + appGlobals.shareOptions.workflowCount + "$selectedBasemapIndex=" + appGlobals.shareOptions.selectedBasemapIndex;
            if (appGlobals.shareOptions.mapPointForInfowindow) {
                urlStr += "$mapPointForInfowindow=" + appGlobals.shareOptions.mapPointForInfowindow.toString();
            }
            if (appGlobals.shareOptions.arrStrAdderss && appGlobals.shareOptions.arrStrAdderss[appGlobals.shareOptions.workflowCount]) {
                urlStr += "$address=" + encodeURIComponent(encodeURIComponent(appGlobals.shareOptions.arrStrAdderss[appGlobals.shareOptions.workflowCount].toString()));
            }
            if (appGlobals.shareOptions.arrAddressMapPoint && appGlobals.shareOptions.arrAddressMapPoint[appGlobals.shareOptions.workflowCount]) {
                urlStr += "$addressMapPoint=" + appGlobals.shareOptions.arrAddressMapPoint[appGlobals.shareOptions.workflowCount].toString();
            }
            if (appGlobals.shareOptions.arrBufferDistance && appGlobals.shareOptions.arrBufferDistance[appGlobals.shareOptions.workflowCount]) {
                urlStr += "$bufferDistance=" + appGlobals.shareOptions.arrBufferDistance[appGlobals.shareOptions.workflowCount].toString();
            }
            if (appGlobals.shareOptions.standardGeoQueryAttribute && appGlobals.shareOptions.workflowCount === 3) {
                urlStr += "$standardGeoQueryAttribute=" + appGlobals.shareOptions.standardGeoQueryAttribute;
            }
            if (appGlobals.shareOptions.selectedObjectIndex && appGlobals.shareOptions.selectedObjectIndex[appGlobals.shareOptions.workflowCount]) {
                urlStr += "$selectedObjectIndex=" + appGlobals.shareOptions.selectedObjectIndex[appGlobals.shareOptions.workflowCount].toString();
            }
            if (appGlobals.shareOptions.paginationIndex && appGlobals.shareOptions.paginationIndex[appGlobals.shareOptions.workflowCount]) {
                urlStr += "$paginationIndex=" + appGlobals.shareOptions.paginationIndex[appGlobals.shareOptions.workflowCount];
            }
            if (appGlobals.shareOptions.communitySelectionFeature && appGlobals.shareOptions.workflowCount === 3) {
                urlStr += "$communitySelectionFeature=" + appGlobals.shareOptions.communitySelectionFeature;
            }
            if (appGlobals.shareOptions.arrWhereClause && appGlobals.shareOptions.arrWhereClause[appGlobals.shareOptions.workflowCount]) {
                urlStr += "$whereClause=" + appGlobals.shareOptions.arrWhereClause[appGlobals.shareOptions.workflowCount].toString();
            }
            if (appGlobals.shareOptions.toFromBussinessFilter && appGlobals.shareOptions.toFromBussinessFilter.length > 0 && appGlobals.shareOptions.workflowCount === 2) {
                urlStr += "$toFromBussinessFilter=" + appGlobals.shareOptions.toFromBussinessFilter;
            }
            if (appGlobals.shareOptions.strGeoLocationMapPoint) {
                urlStr += "$strGeoLocationMapPoint=" + appGlobals.shareOptions.strGeoLocationMapPoint;
            }
            if (appGlobals.shareOptions.sortingData) {
                urlStr += "$strSortingData=" + appGlobals.shareOptions.sortingData;
            }
            if (appGlobals.shareOptions.businessSortData) {
                urlStr += "$strBusinessSortData=" + appGlobals.shareOptions.businessSortData.toString();
            }

            // Attempt the shrinking of the URL
            this.getTinyUrl = commonShare.getTinyLink(urlStr, appGlobals.configData.MapSharingOptions.TinyURLServiceURL);
        },
        /**
        * share application detail with selected share option
        * @param {string} site Selected share option
        * @param {string} tinyUrl Tiny URL for sharing
        * @param {string} urlStr Long URL for sharing
        * @memberOf widgets/share/share
        */
        _share: function (site) {
            /*
            * hide share panel once any of the sharing options is selected
            */
            domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
            if (html.coords(this.divAppContainer).h > 0) {
                domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            }

            // Do the share
            commonShare.share(this.getTinyUrl, appGlobals.configData.MapSharingOptions, site);
        }
    });
});
