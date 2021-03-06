/*blacksheep IT consulting Copyright
* Copyright (C) 2020

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

/*bcrm-mobile-utils.js
* BCRM Utility Library
* DO NOT EDIT THIS FILE!
* use custom library in mobile/custom folder to define custom utility functions
*/
var BCRMHammer; //workaround for hammer trouble

if (typeof(SiebelAppFacade.BCRMMobileUtils) === "undefined")  {
    SiebelJS.Namespace("SiebelAppFacade.BCRMMobileUtils");

    SiebelAppFacade.BCRMMobileUtils = (function () {
        function BCRMMobileUtils(options) {

        }
		BCRMMobileUtils.prototype.GetHammer = function(){
				if (typeof(BCRMHammer) === "undefined"){
					if (typeof(Hammer.Manager) === "undefined"){
						jQuery.getScript("scripts/siebel/custom/mobile/3rdParty/hammer.min.js");
					}
				//work around hammer being unavailable
				BCRMHammer = Hammer;
			}	
		};
		//Get Applet DOM element
        BCRMMobileUtils.prototype.GetAppletElem = function(context){
            var retval = null;
            //get the PM
            var pm = this.ValidateContext(context);
            var appletElem = null;
            if(pm){
                var appletElemId = pm.Get("GetFullId");
                //we better use some constants, one never knows...
                appletElem = $("#" + "s_" +  appletElemId + "_div");
            }
            retval = appletElem;


            return retval;
        };
		
		//Validate/equalize Context: takes any form of applet reference (pm,pr,name,div#id) and returns pm
        BCRMMobileUtils.prototype.ValidateContext = function(object){
            var retval = false;
            try{
                var pm = null;
                //context might be an applet instance
                //the GetPModel function gives it away
                if(typeof(object.GetPModel) === "function"){
                    pm = object.GetPModel();
                }
                //or it is a PM already...
                else if (typeof(object.OnControlEvent) === "function") {
                    pm = object;
                }
                //... or a PR, then we can get the PM easily:
                else if (typeof(object.GetPM) === "function"){
                    pm = object.GetPM();
                }
                //context is neither an applet, PM nor PR...
                //...but could be an id string such as "S_A1" or "Contact List Applet"
                else if (typeof(object) === "string"){
                    var temp = object;
                    var appletmap = SiebelApp.S_App.GetActiveView().GetAppletMap();
                    for (ap in appletmap){
                        if (temp.indexOf("S_") == 0){
                            if (appletmap[ap].GetPModel().Get("GetFullId") == object){
                                pm = appletmap[ap].GetPModel();
                            }
                        }
                        else{ //assume it's the applet name
                            pm = appletmap[temp].GetPModel();
                        }
                    }
                }
                else{
                    throw("Error while equalizing PM.");
					//usually not bad, mostly when called from a PW
                }
            }
            catch(e){
                console.log("BCRMMobileUtils.ValidateContext: " + e.toString());
            }
            finally{
                retval = pm;
            }
            return retval;
        };

		//Get applet type (form,list,chart,tree)
        BCRMMobileUtils.prototype.GetAppletType = function(context){
            var retval = false;
            var type = null;
            var pm = null;
            var id = null;
			var an = "";
            pm = this.ValidateContext(context);
            if (pm){
                if (typeof(pm.Get) === "function"){
                    if(pm.Get("GetListOfColumns")){
                        retval = "list";
                        type = true;
                    }
                }
                id = pm.Get("GetFullId");
                if ($("#" + id).find(".siebui-tree").length != 0){ //it's a tree!
                    retval = "tree";
                    type = true;
                }
                else if (!type){  //finding out whether it's a chart applet is tricky...
                    id = pm.Get("GetFullId").split("_")[1]; //chart applets have weird Ids
                    id = id.toLowerCase().charAt(0) + "_" + id.charAt(1);  //did I mention that they have weird Ids
                    if ($("#" + id).find(".siebui-charts-container").length != 0){
                        retval = "chart"; //It's a Bingo! -- Do you say it like that? -- No, you just say 'Bingo!'.
                    }
                    else{ //no list,tree or chart. 99% sure it's a form applet
                        retval = "form";
                    }
                }
				an = pm.GetObjName();
            }
            else{//not of this world...
                retval = "unknown"
            }
			_$dbg("BCRMMobileUtils.GetAppletType: " + an + " is a " + retval);
            return retval;
        };

		//get array of applets of same type
        BCRMMobileUtils.prototype.GetAppletsByType = function(type){
			_$dbg("BCRMMobileUtils.GetAppletsByType: " + type);
            var retval = [];
            var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
            for (a in am){
                if (this.GetAppletType(a) == type){
                    retval.push(a);
                }
            }
            return retval;
        };

		//get control DOM element by type (button,field) using method or field name
        BCRMMobileUtils.prototype.GetControlElement = function (pm,type,name){
			_$dbg("BCRMMobileUtils.GetControlElement: " + type + " : " + name);
            var pm = this.ValidateContext(pm);
            var ct = pm.Get("GetControls");
            var pr = pm.GetRenderer();
            var retval = [];
            switch (type){
                case "button": for (c in ct){
                    if (ct[c].GetMethodName() == name){
                        retval = pr.GetUIWrapper(ct[c]).GetEl();
                        break;
                    }
                }
                    break;
                case "field": for (c in ct){
                    if (ct[c].GetFieldName() == name){
                        var t;
                        t = pr.GetUIWrapper(ct[c]).GetEl();
                        if (typeof(t) !== "undefined" && $(t).parent(".siebui-applet-title").length == 0){
                            retval = t;
                            break;
                        }

                    }
                    break;

                }
                default: break;
            }

            return retval;
        };

		//hide/show PDQ and Search boxes depending on config object
        BCRMMobileUtils.prototype.PDQHandler = function(){
			_$dbg("BCRMMobileUtils.PDQHandler");
            var vn = SiebelApp.S_App.GetActiveView().GetName();
            var vt = this.GetViewType();
            $("#PDQToolbar").show();
			$("#searchtoolbar").hide();
            var vconf = BCRMPDQConf[vn];
            if (typeof(vconf) === "undefined"){
                vconf = BCRMPDQConf[vt];
            }
            if (typeof(vconf) !== "undefined"){
                if (vconf == "hide"){
                    $("#PDQToolbar").hide();
					$("#searchtoolbar").show();
                }
            }

        };
		//get view type (listview, detailview, complex)
        BCRMMobileUtils.prototype.GetViewType = function(){
			_$dbg("BCRMMobileUtils.GetViewType");
            var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
            var fbc = "";
            var nbc = "";
            var samebc = true;
            var count = 0;
            var retval = "complex";
            for (a in am){
                count++;
                nbc = am[a].GetBusComp().GetName();
                if (fbc != ""){
                    if (nbc != fbc){
                        samebc = false;
                    }
                }
                else{
                    fbc = nbc;
                }

            }
            if (count == 2 && samebc == true){ //two applets on same BC
                retval = "listview";
            }
            if (count >= 2 && samebc == false){ //two or more applets and not all on same BC
                retval = "detailview";
            }
            return retval;
        };
		//beautifier, reads config and adds classes
        BCRMMobileUtils.prototype.Beautifier = function(a){
			
            var pm = this.ValidateContext(a);
			var pr = pm.GetRenderer();
            var ae = this.GetAppletElem(pm);
            var an = pm.GetObjName();
			
            var bc = "BC_" + pm.Get("GetBusComp").GetName();
            var bconf = BCRMBeautifierConf[an];
            if (typeof(bconf) === "undefined"){
                bconf = BCRMBeautifierConf[bc];
            }
            if (typeof(bconf) !== "undefined"){
				_$dbg("BCRMMobileUtils.Beautifier.addClass: " + an);
				for (i = 0; i < bconf.length; i+=2){
					$(ae).find(bconf[i]).addClass(bconf[i+1]);
				}
                
            }
			//email type (cant do in PW because of text field type)
			var cs = pm.Get("GetControls");
			for (c in cs){
			 if (cs[c].GetFieldName() == "Email Address"){ //hard coded field name, extend config when applicable
				var cel = pr.GetUIWrapper(cs[c]).GetEl();
				if(cel){
					_$dbg("BCRMMobileUtils.Beautifier.EmailField: " + an);
					cel.attr("type","email");
					cel.addClass("bcrm-emailtype");
				}
				}
			}	
			//required demo aria-required="true", set placeholder and hide vanilla required "star"
			ae.find("input[aria-required='true']").addClass("bcrm-required");
			ae.find("input[aria-required='true']").attr("required","true");
			ae.find("input[aria-required='true']").attr("placeholder",BCRMGetMsg("REQUIRED_FIELD"));
			ae.find("span.siebui-icon-icon_required").hide();
			
        };
		
		//generate a simple salutation
        BCRMMobileUtils.prototype.GetSalutation = function(){
            var html = $("<div id='bcrm_salutation' class='bcrm-salutation'>");
            var t = "<span class='bcrm-welcome'>" + BCRMGetMsg("WELCOME") + " ";
            t += SiebelApp.S_App.GetProfileAttr("Me.Full Name") + ".</span><br>";
            t += "<span class='bcrm-today'>" + BCRMGetMsg("TODAY_IS") + " " + new Date().toLocaleDateString() + ".</span>";
            html.html(t);
            return html;
        };
		
		//Home Page Beautifier, currently hard coded
        BCRMMobileUtils.prototype.GenerateHomePage = function(){
            //built on Account Home Page, adjust for other screen home views
            var tae = this.GetAppletElem("Account Home Public and Private View Link List Applet");
            var sal = this.GetSalutation();
            if ($("#bcrm_salutation").length == 0){
                tae.before(sal);
            }
            $($(tae).find(".siebui-screen-hp-title")[0]).text("Favorites");
            var rra = this.GetAppletElem("Recent Record Account List Applet");
            $(rra).find(".siebui-screen-hp-title").text("Recent Accounts");
            var iha = this.GetAppletElem("Screen Home Task Assistant List Applet");
            $(iha).hide();
            var ada = this.GetAppletElem("Account Home Add Virtual Form Applet");
            $(ada).hide();
            //background *uff
            $("[title-preserved='Account Home']").addClass("bcrm-home-bg");
            $("[id*='s_S_A']").addClass("bcrm-home-bgt");
            $(".siebui-applet-buttons").addClass("bcrm-home-bgt");
            $(".siebui-applet-buttons").attr("style","background:none!important");
            $(".siebui-screen-applet-head").addClass("bcrm-home-bgt");
            $(".siebui-screen-hp-desc input").addClass("bcrm-home-bgt");
            $("[title-preserved='Account Home']").find("a").addClass("bcrm-home-bgt");
            $(".siebui-screen-hp-desc input").attr("style","background:none!important");
            $(".siebui-applet").addClass("bcrm-home-noshadow");

            //custom links
            var ni = $("<div class='siebui-screen-hp-title bcrm-home-ni'>");
            for (v in BCRMHomeViews){

                var nia = $("<a class='siebui-ctrl-drilldown siebui-anchor-readonly' href='javascript:void(0)'>");
                $(nia).text(BCRMHomeViews[v]);
                $(ni).append(nia);

                $(nia).off("click");
                $(nia).attr("bcrm-view",v);
                $(nia).on("click",function(e){
                    SiebelApp.S_App.GotoView($(this).attr("bcrm-view"));
                });
                $(nia).after("<br>");
            }
            $(tae).find(".siebui-screen-hp-content").after(ni);

        };

		//generate swipe/gesture effect and record change awareness on form applets in detail views
        BCRMMobileUtils.prototype.AddSwiper = function(a){
			
            var pm = this.ValidateContext(a);
            var an = pm.GetObjName();
			
            if (typeof(BCRMSwipeConf[an]) !== "undefined" && this.GetViewType() == "detailview"){
				_$dbg("BCRMMobileUtils.AddSwiper" + an);
                //save pending changes
                pm.AttachPMBinding("ShowSelection",this.NotifyPendingChanges);
                pm.AttachPMBinding("FieldChange",this.NotifyPendingChanges);

                //swiper
                var ael = this.GetAppletElem(pm);
                //ael.sortable({axis: "x"});
				var sarea = $(ael).find("#rsl_section_container");
				if (sarea.length > 0){
					try{
                var sman = new BCRMHammer.Manager($(ael).find("#rsl_section_container")[0],{});
                var sev = new BCRMHammer.Swipe();
                sman.add(sev);
                var that = this;
                sman.on("swipeleft",function(e){
                    var ap = SiebelApp.S_App.GetActiveView().GetActiveApplet();
                    if (ap.CanInvokeMethod("GotoNextSet")){
                        ap.InvokeMethod("GotoNextSet");
						SiebelAppFacade.BCRMMobileActions.prototype.ButtonManager(ap.GetPModel());
                    }
                });
                sman.on("swiperight",function(e){
                    var ap = SiebelApp.S_App.GetActiveView().GetActiveApplet();
                    if (ap.CanInvokeMethod("GotoPreviousSet")){
                        ap.InvokeMethod("GotoPreviousSet");
						SiebelAppFacade.BCRMMobileActions.prototype.ButtonManager(ap.GetPModel());
                    }
                });
                sman.on("swipedown",function(e){
                    var ap = SiebelApp.S_App.GetActiveView().GetActiveApplet();
                    var ael = that.GetAppletElem(ap);
                    if ($(ael).find(".siebui-icon-bttns_more").length > 0){
                        ap.InvokeMethod("ToggleLayout");
                    }
                });
                sman.on("swipeup",function(e){
                    var ap = SiebelApp.S_App.GetActiveView().GetActiveApplet();
                    var ael = that.GetAppletElem(ap);
                    if ($(ael).find(".siebui-icon-bttns_less").length > 0){
                        ap.InvokeMethod("ToggleLayout");
                    }
                });
				}//end try
				catch(e){
					console.log("BCRMMobileUtils.AddSwiper: " + e.toString());
				}
            }
			}
        };
		
		//identify pending state of BC
        BCRMMobileUtils.prototype.IsCommitPending = function(context){
			_$dbg("BCRMMobileUtils.IsCommitPending");
            var pm = this.ValidateContext(context);
            var retvalue = false;
            if (pm){
                //get applet instance
                var applet = SiebelApp.S_App.GetActiveView().GetApplet(pm.GetObjName());
                //get BC instance
                var bc = pm.Get("GetBusComp");
                //call IsCommitPending (kudos to Jeroen Burgers) - this is undocumented!
                var retvalue = bc.IsCommitPending();
            }
            return retvalue;
        };
		
		//safe writerecord
        BCRMMobileUtils.prototype.SavePendingChanges = function(context){
			_$dbg("BCRMMobileUtils.SavePendingChanges");
            var pm = null;
            if (context){
                pm = this.ValidateContext(context);
            }
            else{
                pm = this.ValidateContext(this);
            }
            if (pm){
                if(this.IsCommitPending(pm)){  //unsaved changes exist
                    var applet = SiebelApp.S_App.GetActiveView().GetApplet(pm.GetObjName());
                    //call applet(!) method to force WriteRecord
                    applet.InvokeMethod("WriteRecord");
                }
            }
        };
		//Create notification for pending changes
        BCRMMobileUtils.prototype.NotifyPendingChanges = function(){
			_$dbg("BCRMMobileUtils.NotifyPendingChanges");
            var stamp = $("<div class='bcrm-pending'>");
            var utils = new SiebelAppFacade.BCRMMobileUtils();
            var pm = utils.ValidateContext(this);
            var ael = utils.GetAppletElem(pm);
            if (pm){
                if(utils.IsCommitPending(pm)){  //unsaved changes exist

                    //var that = this;
                    if ($(ael).find(".bcrm-pending").length == 0){
                        $(stamp).text(BCRMGetMsg("PENDING_CHANGES"));
                        $(ael).append(stamp);

                        $(stamp).click(function(){
                            utils.SavePendingChanges(pm);
                        });
                    }
                }
                else{
                    if ($(ael).find(".bcrm-pending").length > 0){
                        $(ael).find(".bcrm-pending").remove();
                    }
                }
            }
        };
		//IntroJs player
        BCRMMobileUtils.prototype.PlayIntro = function(vn){
			
            //localStorage.BCRMINTRONOSHOW = "";
            if (typeof(BCRMIntroConf[vn]) !== "undefined"){
				_$dbg("BCRMMobileUtils.PlayIntro: " + vn);
                var noshow = [];
                if (typeof(localStorage.BCRMINTRONOSHOW) !== "undefined"){
                    noshow = localStorage.BCRMINTRONOSHOW.split(",");
                }
                if (true){
                    var intro = introJs();
                    intro.setOptions(BCRMIntroConf[vn]);
                    var eh = 0;
					if(BCRMIntroConf[vn].BCRMAutoPlay){
                    intro.onexit(function() {
                        eh++;
                        if (eh == 1){
                            var fb = confirm(BCRMGetMsg("INTRO_OPTOUT"));
                            if (fb == false){
								if (typeof(localStorage.BCRMINTRONOSHOW) !== "undefined"){
									var ta = localStorage.BCRMINTRONOSHOW.split(",");
									if ($.inArray(vn,ta) == -1){
										ta.push(vn);
									}
									localStorage.BCRMINTRONOSHOW = ta.join(",");
								}
								else{
									localStorage.BCRMINTRONOSHOW = vn;
								}
                                
                            }
							if (fb == true){
								if (typeof(localStorage.BCRMINTRONOSHOW) !== "undefined"){
								var ta = localStorage.BCRMINTRONOSHOW.split(",");
								for (i = 0; i < ta.length; i++){
									if (ta[i] == vn){
										ta.splice(i,1);
									}
								}
								if (ta.length == 0){
									localStorage.removeItem("BCRMINTRONOSHOW");
								}
								else{
									localStorage.BCRMINTRONOSHOW = ta.join(",");
								}
								}
							}
                        }
                    });
					}
                    intro.start();
                }
            }
        };
		//address fields to map URL
		BCRMMobileUtils.prototype.AddressMapper = function(a){
			if (typeof(a) === "undefined"){
				a = this;
			}
			var utils = new SiebelAppFacade.BCRMMobileUtils();
			var pm = utils.ValidateContext(a);
			var pr = pm.GetRenderer();
			var an = pm.GetObjName();
			pm.AttachPMBinding("ShowSelection",utils.AddressMapper,{scope:pm});
			var conf = BCRMAddress2MapConf[an];
			var href = "";
			var ha;
			if (typeof(conf) !== "undefined"){
				_$dbg("BCRMMobileUtils.AddressMapper: " + an);
				var rs = pm.Get("GetRecordSet");
				var cs = pm.Get("GetControls");
				var lfs = conf["link"];
				var afs = conf["addr"];
				var hfs = conf["hide"];
				//get address
				var adr = [];
				for (i = 0; i < afs.length; i++){
					
						if ( rs.length > 0 && typeof(rs[0][afs[i]]) !== "undefined"){
							adr.push(rs[0][afs[i]]);
						}
					
				}
				href = BCRMGetMsg("GMAPURL") + adr.join(",");
				ha = "<a class='bcrm-fmap' target='_blank' href='" + href + "'></a>";
				var lfes = [];
				//add link to control
				for (i = 0; i < lfs.length; i++){
					for (c in cs){
						if (cs[c].GetFieldName() == lfs[i]){
							lfes.push(pr.GetUIWrapper(cs[c]).GetEl());
						}
					}
				} 
				for (j = 0; j < lfes.length; j++){
					if ($(lfes[j]).val() != ""){
						$(lfes[j]).wrap(ha);
						$(lfes[j]).addClass("bcrm-fmap");
					}
				}	
				//hide fields
				var hfes = [];
				for (i = 0; i < hfs.length; i++){
					for (c in cs){
						if (cs[c].GetFieldName() == hfs[i]){
							hfes.push(pr.GetUIWrapper(cs[c]).GetEl());
						}
					}
				} 
				for (h in hfes){
					$(hfes[h]).parent().parent().hide();
				}
				
			}
		};	

        return BCRMMobileUtils;
    }());
}
_$dbg("bcrm-mobile-utils.js loaded");