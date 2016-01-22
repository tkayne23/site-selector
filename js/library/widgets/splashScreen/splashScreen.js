/*global define,dojo,appGlobals */
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
    "dojo/window",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/on",
    "dojo/text!./templates/splashScreenTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-class",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings"
], function (declare, domConstruct, domStyle, win, lang, domAttr, on, template, _WidgetBase, _TemplatedMixin, domClass, _WidgetsInTemplateMixin, sharedNls) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,

        /**
        * create splashScreen widget
        * @class
        * @name widgets/splashScreen/splashScreen
        */
        postCreate: function () {
            this.inherited(arguments);
            domConstruct.create("div", { "class": "customButtonInner", "innerHTML": sharedNls.buttons.okButtonText }, this.customButton);
            this.own(on(this.customButton, "click", lang.hitch(this, function () {
                this._hideSplashScreenDialog();
            })));
            /**
            * create UI for splashscreen
            * @memberOf widgets/splashScreen/splashScreen
            */
            this.domNode = domConstruct.create("div", { "class": "esriGovtLoadSpashScreen" }, document.body);
            this.domNode.appendChild(this.splashScreenScrollBarOuterContainer);
            domConstruct.create("div", { "class": "esriCTLoadingIndicator", "id": "splashscreenlodingIndicator" }, this.splashScreenScrollBarOuterContainer);
            on(window, "resize", lang.hitch(this, this.resizeSplashScreenDialog));
        },

        /**
        * set splashContainer width
        * @memberOf widgets/splashScreen/splashScreen
        */
        showSplashScreenDialog: function () {
            var splashScreenContent;
            domStyle.set(this.domNode, "display", "block");
            splashScreenContent = domConstruct.create("div", { "class": "esriGovtSplashContent" }, this.splashScreenScrollBarContainer);
            this.splashScreenScrollBarContainer.style.height = (this.splashScreenDialogContainer.offsetHeight - 70) + "px";
            domAttr.set(splashScreenContent, "innerHTML", appGlobals.configData.SplashScreen.SplashScreenContent);
        },

        /*
        *resize splash screen
        * @memberOf widgets/splashScreen/splashScreen
        */
        resizeSplashScreenDialog: function () {
            if (this.splashScreenScrollBarContainer && this.splashScreenDialogContainer) {
                this.splashScreenScrollBarContainer.style.height = (this.splashScreenDialogContainer.offsetHeight - 70) + "px";
            }
        },
        /**
        * hide splash screen dialog
        * @memberOf widgets/splashScreen/splashScreen
        */
        _hideSplashScreenDialog: function () {
            domStyle.set(this.domNode, "display", "none");
        }
    });
});
