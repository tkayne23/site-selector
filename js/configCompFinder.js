﻿/*global dojo,define */
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
define([], function () {
    return {

        // This file contains various configuration settings for esri template

        // Use this file to perform the following:

        // 1. Specify application Name                                 - [ Tag(s) to look for: ApplicationName ]
        // 2. Set path for application icon                           - [ Tag(s) to look for: ApplicationIcon ]
        // 3. Set path for application favicon                     - [ Tag(s) to look for: ApplicationFavicon ]
        // 4. Set URL for help page                                         - [ Tag(s) to look for: HelpURL ]
        // 5. Set URL for logo URL                                           - [ Tag(s) to look for: CustomLogoUrl ]
        // 6. Set content for splash screen                          - [ Tag(s) to look for: SplashScreen ]
        // 7. Set application theme URL                                - [ Tag(s) to look for: ThemeColor ]
        // 8. Specify URLs for base maps                             - [ Tag(s) to look for: BaseMapLayers ]
        // 9. Set URL for geometry service                            - [ Tag(s) to look for: GeometryService ]
        // 10. Specify URL for geo-enrichment service      - [ Tag(s) to look for: GeoEnrichmentService]
        // 11. Customize zoom level for address search  - [ Tag(s) to look for: ZoomLevel ]
        // 12. Customize InfoPopupHeight                           - [ Tag(s) to look for: InfoPopupHeight ]
        // 13. Customize InfoPopupWidth                           - [ Tag(s) to look for: InfoPopupWidth ]
        // 14. Specify ShowNullValueAs                               - [ Tag(s) to look for: ShowNullValueAs ]
        // 15. Set map attribution                                          - [ Tag(s) to look for: ShowMapAttribution ]
        // 16. Set proxy URL                                                     - [ Tag(s) to look for: ProxyUrl ]
        // 17. Set distance unit settings                               - [ Tag(s) to look for: DistanceUnitSettings]
        // 18. Customize buffer symbol                         - [ Tag(s) to look for: BufferSymbology]
        // 19. Customize ripple color                                   - [ Tag(s) to look for: RippleColor]
        // 20. Customize ripple size                                     - [ Tag(s) to look for: LocatorRippleSize]
        // 21. Customize address search settings             - [ Tag(s) to look for: LocatorSettings]
        // 22. Specify URLs for map sharing                        - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]
        // 23. Specify header widget settings                      - [ Tag(s) to look for: AppHeaderWidgets ]

        // ------------------------------------------------------------------------------------------------------------------------
        // GENERAL SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set application title
        ApplicationName: "Residential Comp Finder",

        // Set application icon path
        ApplicationIcon: "/js/library/themes/images/comp-finder-logo-blue.png",

        // Set application Favicon path
        ApplicationFavicon: "/js/library/themes/images/faviconBlue_CompFinder.ico",

        // Set URL of help page/portal
        HelpURL: "help_CompFinder.htm",

        // Set custom logo url, displayed in lower left corner. Set to empty "" to disable.
        CustomLogoUrl: "",

        // Set splash window content - Message that appears when the application starts
        SplashScreen: {
            SplashScreenContent: "The <b>Comp Finder</b> application helps citizens and real estate professionals search for and locate recent residential property sales, and combine their sales search with key community and business demographic information.   Access to this information facilitates better real estate decisions.",
            IsVisible: true
        },

        //Set application theme
        ThemeColor: "js/library/themes/styles/blueTheme.css",

        // ------------------------------------------------------------------------------------------------------------------------
        // BASEMAP SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set options for basemap
        // Please note: All base-maps need to use the same spatial reference.
        // Specify URL to ArcGIS Online REST API
        PortalAPIURL: "http://www.arcgis.com/sharing/rest/",
        // Specify the title of group that contains basemaps
        BasemapGroupTitle: "Basemaps",
        // Specify the user name of owner of the group that contains basemaps
        BasemapGroupOwner: "GISITAdmin",
        // Specify spatial reference for basemaps, since all basemaps need to use the same spatial reference
        BasemapSpatialReferenceWKID: 102100,
        // Specify path to image used to display the thumbnail for a basemap when ArcGIS Online does not provide it
        NoThumbnail: "js/library/themes/images/not-available.png",

        // Set geometry service URL
        GeometryService: "https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer/",

        // Set geoenrichment service URL
        GeoEnrichmentService: "http://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver",

        // Following zoom level will be set for the map upon searching an address
        ZoomLevel: 16,

        //minimum height should be 310 for the info-popup in pixels
        InfoPopupHeight: 250,

        // Minimum width should be 330 for the info-popup in pixels
        InfoPopupWidth: 300,

        // Set string value to be shown for null or blank values
        ShowNullValueAs: "N/A",

        //Set map source data as visible or not
        ShowMapAttribution: true,


        // Set proxy url
        ProxyUrl: "/proxy/proxy.ashx",

        // Set buffer distance unit
        DistanceUnitSettings: {
            DistanceUnitName: "Miles", // Allowed values for DistanceUnitName are "Miles", "Kilometers", "Meters" and "Feet".
            MinimumValue: 1,
            MaximumValue: 5
        },

        // Set buffer symbology
        BufferSymbology: {
            FillSymbolColor: "0,171,169",
            FillSymbolTransparency: "0.15",
            LineSymbolColor: "42,106,255",
            LineSymbolTransparency: "0.30"
        },

        //Set the color of the circle around the selected point
        RippleColor: "0,171,169",

        //Set the size of the circle around the selected point
        LocatorRippleSize: 40,

        // WORKFLOW SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Configure workflows

        // Name: Specify the workflow name. Workflow names have to be unique. It is displayed in the tabs in search panel.
        // WebMapId: Specify the WebMapId for operational layers.
        // SearchSettings: Configure search settings for each workflow.
        // Title: Must match layer name specified in webmap.
        // QueryLayerId: This is the layer index in the webmap and is used for performing queries.
        // SearchDisplayTitle: This text is displayed in search results as the title to group results.
        // SearchDisplayFields: Attribute that will be displayed in the search box when user performs a search.
        // SearchExpression: Configure the query expression to be used for search.
        // FilterSettings: Configure filtering options for each tab.
        // FilterRangeFields: Text box controls for 'From' and 'To' are displayed for filter ranges configured under FilterRangeFields.
        // RegularFilterOptionFields: Checkboxes are displayed for filters configured under FilterOptionFields.
        // AdditionalFilterOptions: Checkboxes are displayed for filters configured under AdditionalFilterOptions.
        // InfoPanelSettings: Configure settings for items shown in info panel.
        // ResultContents: Used for displaying a list of search results from the operational layer(s).
        // LayerContents: Used for displaying detailed information for the selected feature from the operational layer(s).
        // GeoEnrichmentContents: Configure settings to display data collections or variables from geoenrichment.
        // DownloadSettings: Configure settings for downloading reports from geoprocessing service or geoenrichment.

        WebMapId: "1f69483b404a41749c85e33ce925be89",
          Workflows: [
            {
                Name: "Sales",
                Enabled: true,
                SearchSettings: [
                    {
                        Title: "Sales",
                        QueryLayerId: "0",
                        SearchDisplayTitle: "Parcel",
                        SearchDisplayFields: "${PARCELID}",
                        SearchExpression: "UPPER(PARCELID) LIKE UPPER('${0}%')",

                        FilterSettings: {
                            FilterRangeFields: [
                                {
                                    DisplayText: "Floor Area (sqft)",
                                    FieldName: "RESFLRAREA"
                                }, {
                                    DisplayText: "Sale Price",
                                    FieldName: "SALEAMNT"
                                }, {
                                    DisplayText: "Assessed Value",
                                    FieldName: "CNTASSDVAL"
                                }, {
				    DisplayText: "Year Built",
                                    FieldName: "RESYRBLT"
				}
                            ],
                            RegularFilterOptionFields: [ ],

                            AdditionalFilterOptions: {
                                Enabled: true,
                                FilterFieldName: "RESSTRTYPE",
                                FilterOptions: [
                                    {
                                        DisplayText: "Colonial",
                                        FieldValue: "Colonial"
                                    }, {
                                        DisplayText: "Georgian",
                                        FieldValue: "Georgian"
                                    }, {
                                        DisplayText: "Bungalow",
                                        FieldValue: "Bungalow"
                                    }, {
                                        DisplayText: "Ranch",
                                        FieldValue: "Ranch"
                                    }
                                ]
                            }
                        }
                    }
                ],
                InfoPanelSettings: {
                    ResultContents: {
                        ShowAttachments: true,
                        DisplayFields: [
                            {
                                DisplayText: "Parcel Number:",
                                FieldName: "PARCELID",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Site Address:",
                                FieldName: "SITEADDRESS",
                                SortingEnabled: true
		            }, {
                                DisplayText: "Sale Price: $",
                                FieldName: "SALEAMNT",
                                SortingEnabled: false
                            }, {
                                DisplayText: "Current Assessed Value: $",
                                FieldName: "CNTASSDVAL",
                                SortingEnabled: true
                            }

                        ]
                    },
                    LayerContents: {
                        ShowAttachments: true,
                        DisplayTitle: "Property Information",
                        DisplayFields: [
                              {
                                DisplayText: "Parcel Number:",
                                FieldName: "PARCELID",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Site Address:",
                                FieldName: "SITEADDRESS",
                                SortingEnabled: true
			    }, {
                                DisplayText: "Sale Price: $",
                                FieldName: "SALEAMNT",
                                SortingEnabled: false
                            }, {
                                DisplayText: "Current Assessed Value:",
                                FieldName: "CNTASSDVAL",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Residential Floor Area (sq. ft):",
                                FieldName: "RESFLRAREA",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Grantor:",
                                FieldName: "GRANTOR",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Grantee:",
                                FieldName: "GRANTEE",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Tax District:",
                                FieldName: "CVTTXCD",
                                SortingEnabled: true
                            }
                        ]
                    },
                    GeoenrichmentDistance: {
                        Unit: "UNIT_STATUTE_MILE",
                        BufferDistance: 1
                    },
                    GeoEnrichmentContents: {
                        DisplayTitle: "Neighborhood Information",
                        DisplayFields: [
                            {
                                DisplayText: "Median Home Value",
                                FieldName: "KeyUSFacts.MEDVAL_CY"
                            }, {
                                DisplayText: "Average Home Value",
                                FieldName: "KeyUSFacts.AVGVAL_CY"
			    }, {	
				DisplayText: "Average Household Income",
                                FieldName: "KeyUSFacts.AVGHINC_CY"
                            }, {
                                DisplayText: "Median Household Income",
                                FieldName: "KeyUSFacts.MEDHINC_CY"
                            }, {
                                DisplayText: "Per Capita Income",
                                FieldName: "KeyUSFacts.PCI_CY"
			    }, {
				DisplayText: "Dominant Tapestry Segment",
                                FieldName: "Policy.TSEGNAME"
			    }, {	
                                DisplayText: "Labor Force Participation Rate",
                                FieldName: "industry.CIVLBFR_CY"
                            }, {
                                DisplayText: "Total Population",
                                FieldName: "KeyUSFacts.TOTPOP_CY"
                            }, {
                                DisplayText: "Total Households",
                                FieldName: "KeyUSFacts.TOTHH_CY"
                            }, {
                                DisplayText: "Average Household Size",
                                FieldName: "KeyUSFacts.AVGHHSZ_CY"
                            }, {
                                DisplayText: "Total Housing Units",
                                FieldName: "KeyUSFacts.TOTHU_FY"
                            }, {
                                DisplayText: "Owner Occupied HUs",
                                FieldName: "KeyUSFacts.OWNER_CY"
                            }, {
                                DisplayText: "Renter Occupied HUs",
                                FieldName: "KeyUSFacts.RENTER_CY"
                            }, {
                                DisplayText: "Vacant Housing Units",
                                FieldName: "KeyUSFacts.VACANT_CY"
                            }
                        ]
                    },
                    DownloadSettings: [
                        {
                            DisplayOptionTitle: "Property Information",
                            GeoProcessingServiceURL: "http://52.26.253.224:6080/arcgis/rest/services/GeneratePDFReport/GPServer/GeneratePDFReport",
                            Filetype: "PDF" //allowed PDF
                        }, {
                            DisplayOptionTitle: "Traffic Count Profile",
                            GeoEnrichmentReportName: "traffic",
                            Filetype: "PDF" //allowed PDF or XLSX
			}, {
                            DisplayOptionTitle: "Demographic and Income Profile",
                            GeoEnrichmentReportName: "dandi",
                            Filetype: "PDF" //allowed PDF or XLSX
                        }
                    ]
                }
            }, {
                Name: "Sites",
                Enabled: false,
                SearchSettings: [
                    {
                        Title: "Sites",
                        QueryLayerId: "0",
                        SearchDisplayTitle: "Sites",
                        SearchDisplayFields: "${FACNAME}, ${FACTYPE}, ${FULLADDR}",
                        SearchExpression: "UPPER(FACNAME) LIKE UPPER('${0}%') OR UPPER(FACTYPE) LIKE UPPER('${0}%') OR UPPER(FULLADDR) LIKE UPPER('${0}%')",
                        FilterSettings: {
                            FilterRangeFields: [
                                {
                                    DisplayText: "Area (acres)",
                                    FieldName: "TOTAREA"
                                }
                            ],
                            RegularFilterOptionFields: [ ],
                            AdditionalFilterOptions: {
                                Enabled: true,
                                FilterFieldName: "ZONEDESC",
                                FilterOptions: [
                                    {
                                        DisplayText: "Residential",
                                        FieldValue: "Residential"
                                    }, {
                                        DisplayText: "Industrial",
                                        FieldValue: "Industrial"
                                    }, {
                                        DisplayText: "Office",
                                        FieldValue: "Office"
                                    }, {
                                        DisplayText: "Retail",
                                        FieldValue: "Retail"
                                    }
                                ]
                            }
                        }
                    }
                ],
                InfoPanelSettings: {
                    ResultContents: {
                        ShowAttachments: true,
                        DisplayFields: [
                            {
                                DisplayText: "Name:",
                                FieldName: "FACNAME",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Address:",
                                FieldName: "FULLADDR",
                                SortingEnabled: true
                            }, {
                                DisplayText: "County:",
                                FieldName: "SITECOUNTY",
                                SortingEnabled: false
                            }, {
                                DisplayText: "Area (acres):",
                                FieldName: "TOTAREA",
                                SortingEnabled: true
                            }, {
                                DisplayText: "Zipcode:",
                                FieldName: "SITEZIP",
                                SortingEnabled: false
                            }
                        ]
                    },
                    LayerContents: {
                        ShowAttachments: true,
                        DisplayTitle: "Site Information",
                        DisplayFields: [
                            {
                                DisplayText: "Name:",
                                FieldName: "FACNAME"
                            }, {
                                DisplayText: "Address:",
                                FieldName: "FULLADDR"
                            }, {
                                DisplayText: "County:",
                                FieldName: "SITECOUNTY"
                            }, {
                                DisplayText: "Zipcode:",
                                FieldName: "SITEZIP"
                            }, {
                                DisplayText: "Type:",
                                FieldName: "ZONEDESC"
                            }, {
                                DisplayText: "Area (acres):",
                                FieldName: "TOTAREA"
                            }
                        ]
                    },
                    GeoenrichmentDistance: {
                        Unit: "UNIT_STATUTE_MILE",
                        BufferDistance: 1
                    },
                    GeoEnrichmentContents: {
                        DisplayTitle: "Neighborhood Information",

                        DisplayFields: [
                            {
                                DisplayText: "Dominant Tapestry Segment",
                                FieldName: "Policy.TSEGNAME"
                            }, {
                                DisplayText: "Labor Force Participation Rate",
                                FieldName: "industry.CIVLBFR_CY"
                            }, {
                                DisplayText: "Total Population",
                                FieldName: "KeyUSFacts.TOTPOP_CY"
                            }, {
                                DisplayText: "Total Households",
                                FieldName: "KeyUSFacts.TOTHH_CY"
                            }, {
                                DisplayText: "Average Household Size",
                                FieldName: "KeyUSFacts.AVGHHSZ_CY"
                            }, {
                                DisplayText: "Average Household Income",
                                FieldName: "KeyUSFacts.AVGHINC_CY"
                            }, {
                                DisplayText: "Median Household Income",
                                FieldName: "KeyUSFacts.MEDHINC_CY"
                            }, {
                                DisplayText: "Per Capita Income",
                                FieldName: "KeyUSFacts.PCI_CY"
                            }, {
                                DisplayText: "Total Housing Units",
                                FieldName: "KeyUSFacts.TOTHU_FY"
                            }, {
                                DisplayText: "Owner Occupied HUs",
                                FieldName: "KeyUSFacts.OWNER_CY"
                            }, {
                                DisplayText: "Renter Occupied HUs",
                                FieldName: "KeyUSFacts.RENTER_CY"
                            }, {
                                DisplayText: "Vacant Housing Units",
                                FieldName: "KeyUSFacts.VACANT_CY"
                            }, {
                                DisplayText: "Median Home Value",
                                FieldName: "KeyUSFacts.MEDVAL_CY"
                            }, {
                                DisplayText: "Average Home Value",
                                FieldName: "KeyUSFacts.AVGVAL_CY"
                            }
                        ]
                    },
                    DownloadSettings: [
                        {
                            DisplayOptionTitle: "Site Information",
                            GeoProcessingServiceURL: "http://52.26.253.224:6080/arcgis/rest/services/GeneratePDFReport/GPServer/GeneratePDFReport",
                            Filetype: "PDF" //allowed PDF
                        }, {
                            DisplayOptionTitle: "Traffic Count Profile",
                            GeoEnrichmentReportName: "traffic",
                            Filetype: "PDF" //allowed PDF or XLSX
						}, {
                            DisplayOptionTitle: "Demographic and Income Profile",
                            GeoEnrichmentReportName: "dandi",
                            Filetype: "PDF" //allowed PDF or XLSX
                        }
                    ]
                }
            }, {
                Name: "Business",
                Enabled: false,
                FilterSettings: {
                    BusinesSortOptions: { Option: "Count,Revenue,Employees" },
                    FilterRangeFields: [
                        {
                            DisplayText: "Annual Revenue ($)",
                            VariableNameSuffix: "_SALES"
                        }, {
                            DisplayText: "Number of employees",
                            VariableNameSuffix: "_EMP"
                        }
                    ]
                },
                InfoPanelSettings: {
                    GeoEnrichmentContents: [
                        {
                            DisplayTitle: "Business Information",
                            DisplayTextForBusinessCount: "Count",
                            BusinessDataCollectionName: "industrybynaicscode",

                            BusinessSummaryFields: [
                                {
                                    DisplayText: "Businesses",
                                    FieldName: "industrybynaicscode.N01_BUS"
                                }, {
                                    DisplayText: "Revenue",
                                    FieldName: "industrybynaicscode.N01_SALES"
                                }, {
                                    DisplayText: "Employees",
                                    FieldName: "industrybynaicscode.N01_EMP"
                                }, {
                                    DisplayText: "Unemployment",
                                    FieldName: "industry.UNEMPRT_CY"
                                }
                            ]
                        }, {
                            DisplayTitle: "Demographic Information",

                            DisplayFields: [
                                {
                                    DisplayText: "Dominant Tapestry Segment",
                                    FieldName: "Policy.TSEGNAME"
                                }, {
                                    DisplayText: "Labor Force Participation Rate",
                                    FieldName: "industry.CIVLBFR_CY"
                                }, {
                                    DisplayText: "Total Population",
                                    FieldName: "KeyUSFacts.TOTPOP_CY"
                                }, {
                                    DisplayText: "Total Households",
                                    FieldName: "KeyUSFacts.TOTHH_CY"
                                }, {
                                    DisplayText: "Average Household Size",
                                    FieldName: "KeyUSFacts.AVGHHSZ_CY"
                                }, {
                                    DisplayText: "Average Household Income",
                                    FieldName: "KeyUSFacts.AVGHINC_CY"
                                }, {
                                    DisplayText: "Median Household Income",
                                    FieldName: "KeyUSFacts.MEDHINC_CY"
                                }, {
                                    DisplayText: "Per Capita Income",
                                    FieldName: "KeyUSFacts.PCI_CY"
                                }, {
                                    DisplayText: "Total Housing Units",
                                    FieldName: "KeyUSFacts.TOTHU_FY"
                                }, {
                                    DisplayText: "Owner Occupied HUs",
                                    FieldName: "KeyUSFacts.OWNER_CY"
                                }, {
                                    DisplayText: "Renter Occupied HUs",
                                    FieldName: "KeyUSFacts.RENTER_CY"
                                }, {
                                    DisplayText: "Vacant Housing Units",
                                    FieldName: "KeyUSFacts.VACANT_CY"
                                }, {
                                    DisplayText: "Median Home Value",
                                    FieldName: "KeyUSFacts.MEDVAL_CY"
                                }, {
                                    DisplayText: "Average Home Value",
                                    FieldName: "KeyUSFacts.AVGVAL_CY"
                                }
                            ]
                        }
                    ],
                    DownloadSettings: [
                        {
                            DisplayOptionTitle: "Business Summary",
                            GeoEnrichmentReportName: "business_summary",
                            Filetype: "PDF" //allowed PDF or XLSX
                        }, {
                            DisplayOptionTitle: "Demographic and Income Profile",
                            GeoEnrichmentReportName: "dandi",
                            Filetype: "PDF" //allowed PDF or XLSX
                        }
                    ]
                }
            }, {
                Name: "Communities",
                Enabled: true,
                EnableSearch: true,
                EnableDropdown: true,
                FilterSettings: {
                    StandardGeographyQuery: {
                        LocatorDefaultAddress: "Naperville, IL",
                        QueryField: "geographyQuery",
                        SourceCountry: "US",
                        FeatureLimit: 10
                    },
                    FilterLayer: {
                        Title: "Municipalities",
                        QueryLayerId: "2",
                        FilterFieldName: "COUNTYNAME"
                    },
                    InfoPanelSettings: {
                        GeoEnrichmentContents: {
                            DisplayTitle: "Community Information",

                            DisplayFields: [
                                {
                                    DisplayText: "Dominant Tapestry Segment",
                                    FieldName: "Policy.TSEGNAME"
                                }, {
                                    DisplayText: "Labor Force Participation Rate",
                                    FieldName: "industry.CIVLBFR_CY"
                                }, {
                                    DisplayText: "Total Population",
                                    FieldName: "KeyUSFacts.TOTPOP_CY"
                                }, {
                                    DisplayText: "Total Households",
                                    FieldName: "KeyUSFacts.TOTHH_CY"
                                }, {
                                    DisplayText: "Average Household Size",
                                    FieldName: "KeyUSFacts.AVGHHSZ_CY"
                                }, {
                                    DisplayText: "Average Household Income",
                                    FieldName: "KeyUSFacts.AVGHINC_CY"
                                }, {
                                    DisplayText: "Median Household Income",
                                    FieldName: "KeyUSFacts.MEDHINC_CY"
                                }, {
                                    DisplayText: "Per Capita Income",
                                    FieldName: "KeyUSFacts.PCI_CY"
                                }, {
                                    DisplayText: "Total Housing Units",
                                    FieldName: "KeyUSFacts.TOTHU_FY"
                                }, {
                                    DisplayText: "Owner Occupied HUs",
                                    FieldName: "KeyUSFacts.OWNER_CY"
                                }, {
                                    DisplayText: "Renter Occupied HUs",
                                    FieldName: "KeyUSFacts.RENTER_CY"
                                }, {
                                    DisplayText: "Vacant Housing Units",
                                    FieldName: "KeyUSFacts.VACANT_CY"
                                }, {
                                    DisplayText: "Median Home Value",
                                    FieldName: "KeyUSFacts.MEDVAL_CY"
                                }, {
                                    DisplayText: "Average Home Value",
                                    FieldName: "KeyUSFacts.AVGVAL_CY"
                                }
                            ]
                        },
                        DownloadSettings: [{
                            DisplayOptionTitle: "Community Profile",
                            GeoEnrichmentReportName: "community_profile",
                            Filetype: "PDF" //allowed PDF or XLSX
                        }, {
                            DisplayOptionTitle: "Demographic and Income Profile",
                            GeoEnrichmentReportName: "dandi",
                            Filetype: "PDF" //allowed PDF or XLSX
                        }]
                    }
                }
            }],
        // ------------------------------------------------------------------------------------------------------------------------
        // ADDRESS SEARCH SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set locator settings such as locator symbol, size, display fields, match score
        // LocatorParameters: Parameters(text, outFields, maxLocations, bbox, outSR) used for address and location search.
        // AddressSearch: Candidates based on which the address search will be performed.
        // AddressMatchScore: Setting the minimum score for filtering the candidate results.
        // MaxResults: Maximum number of locations to display in the results menu.
        LocatorSettings: {
            LocatorFilterFieldName: "Addr_Type",
            LocatorFilterFieldValues: ['PointAddress', 'BuildingName', 'StreetAddress', 'StreetInt', 'StreetName', 'Postal', 'POI', 'Locality'],
            DefaultLocatorSymbol: "/js/library/themes/images/redpushpin.png",
            MarkupSymbolSize: {
                width: 35,
                height: 35
            },
            DisplayText: "Address",
            LocatorDefaultAddress: "23 S Julian St, Naperville, Illinois, USA",
            LocatorParameters: {
                SearchField: "SingleLine",
                SearchBoundaryField: "searchExtent"
            },
            LocatorURL: "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
            LocatorOutFields: ["Addr_Type", "Type", "Score", "Match_Addr", "xmin", "xmax", "ymin", "ymax"],
            DisplayField: "${Match_Addr}",
            AddressMatchScore: {
                Field: "Score",
                Value: 80
            },
            MaxResults: 100
        },

        // ------------------------------------------------------------------------------------------------------------------------
        // SETTINGS FOR MAP SHARING
        // ------------------------------------------------------------------------------------------------------------------------

        // Set URL for TinyURL service, and URLs for social media
        // MapSharingOptions: Allow user to share map using social media.
        // TinyURLServiceURL: Set URL for TinyURL service.
        // FacebookShareURL:  Allow user to share application using facebook.
        // TwitterShareURL:  Allow user to share application using twitter.
        // ShareByMailLink:  Allow user to share application using mail.
        MapSharingOptions: {
            TinyURLServiceURL: "https://api-ssl.bitly.com/v3/shorten?longUrl=${0}",
            TinyURLResponseAttribute: "data.url",
            FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Residential%20Comp%20Finder",
            TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Residential%20Comp%20Finder ${0}",
            ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map&body=${0}"
        },

        //------------------------------------------------------------------------------------------------------------------------
        // Header Widget Settings
        //------------------------------------------------------------------------------------------------------------------------
        // Set widgets settings such as widget title, widgetPath, mapInstanceRequired to be displayed in header panel
        // WidgetPath: path of the widget respective to the widgets package.
        // The geolocation button has been hidden from the user interface by commenting out the widgetpath for geolocation below. You can enable geolocation by uncommenting the widgetpath for geolocation. The geolocation button, however, will only work on browsers supporting geolocation over HTTP connections.  If a browser requires a HTTPS connection to support geolocation and the button is enabled, the button will not work, but the application will work correctly otherwise.

        AppHeaderWidgets: [
            {
                WidgetPath: "widgets/siteLocator/siteLocator"
            }, 
            //{
            //    WidgetPath: "widgets/geoLocation/geoLocation"
            //}, 
            {
                WidgetPath: "widgets/share/share"
            }, {
                WidgetPath: "widgets/help/help"
            }
        ]

    };
});
