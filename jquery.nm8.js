(function($){ 
/*
	todo:
	conditional statements
*/	
	var methods = {
	
		init : function( options ){
			var $this = $(this);
			var opts = $.extend({}, $.fn.nm8.defaults, options);
			window.aniMatrix = new Array(1);
			$this.data('animationSwitch',true);
			$.ajax({
				type: "GET",
				url: opts.screenplay,
				dataType: "xml",
				
				error:function(xhr, ajaxOptions, thrownError){
					//console.log(xhr.status);
					//console.log(thrownError);
				},
			
				success: function(xml) {
				
					$this.data('screenplay' , xml);
					$this.data('current' , 0);
					
					$(xml).find('stageconfig').each(function(){												
						$this.nm8('createStage');
					});	
					
					$(xml).find('style').each(function(){												
						$("<style type='text/css'>"+ $(this).text() +"</style>").appendTo("head");
					});
					
					$(xml).find('inventory item').each(function(){
						var itemId = $(this).attr('id');
						$this.nm8('addItem',itemId,$(this).find('payload').text(),$(this).attr('hide'), $(this).attr('width'),$(this).attr('height'),$(this).attr('top'), $(this).attr('left'),$(this).attr('layer'),$(this).attr('onClick'),$(this).attr('parentID'));
					});

					$(xml).find('xmlActions xmlAction').each(function(){
						//console.log(this);
						//console.log(methods);
						var methodName =  $(this).attr('name');
						var methodBody = $(this).text();
		
						//console.log(methodName);
						//console.log(methodBody);
						methods[methodName] = new Function('id', 'sceneId', 'obj',methodBody);
						//console.log(methods);
						
					});

					
					$this.nm8('start');							
				
				}
			});			
		
		},

		createStage :	function(){
			$(this).empty();
			$(this).addClass('nm8Stage')			;
			$(this).append("<div class='lens' style='position:relative;width:100%;height:100%;'></div>");	
		},
		
		start: function(){			
			$(this).nm8('runScene',1); 
		},
			
		runScene : function(id){
			var $this = $(this);
			var xml = $this.data('screenplay');	
			var delay = 0;
			
			if($this.data('current')){
				$(xml).find('scenes transition[from='+$this.data('current')+'][to='+id+']').each(function(){	
					//console.log(this);				
					$this.nm8('runActions',$(this), $this.data('current'));
					delay = $(this).attr('timeframe');	
				});				
			}		
			
			if(delay){
				setTimeout(function(){	
					$this.data('current', id );
					$(xml).find('scenes scene[id='+id+'] init').each(function(){
						$this.nm8('runActions',$(this), id);	
					});				
				},delay);			
			} else {
				$this.data('current', id );
				$(xml).find('scenes scene[id='+id+'] init').each(function(){
				$this.nm8('runActions',$(this), id);	
			});				
			}			
			
		},
		
		runActions:function(itemActions,sceneId){
			var $this = $(this);				
						
			function passThrough(subAction,sceneId){				
				$this.nm8('runActions',subAction,sceneId);	
			}			
			
			$(itemActions).children('action, wait, repeat,xmlAction,extensionAction').each(function(){	
			var $act = $(this);
			var itemID = $act.attr('itemID');
			var xml = $this.data('screenplay');
			
			var actionExpression = $act.prop('tagName');
			
			if(actionExpression == 'action'){
				actionExpression =$act.attr('name');	
			}
			//console.log(actionExpression);
			switch(actionExpression){
			
				case "wait":
					var myTimeout = setTimeout(function(){
						//clean up any timer functions on scene change								
						if($this.data('current') !== sceneId){
							clearTimeout(myTimeout);
						} else{
							passThrough($act,sceneId);	
						}
					},$act.attr('delay'));						
				break;

				case "actionGroup":
					$(xml).find('actionGroups actionGroup[name='+$act.attr('name')+']').each(function(){						
						$act.text($(this).text());
						$this.nm8('runScript',itemID,sceneId,$act);						
					});			
				break;

				case "extensionAction":
					//console.log('ca1');
					$this.nm8.customMethods[$act.attr('name')].apply( this, [itemID,sceneId,$act]);				
				break;
				
				case "repeat":
					var count = $act.attr('count');	
					if(count){
						var myTimeouts = new Array(1);
						var timeout = 0;
						for(var i = 0; i < count; i++){
							timeout = ($act.attr('every') * i);
							myTimeouts[i] = setTimeout(function(){
								//clean up any timer functions on scene change								
								if($this.data('current') !== sceneId){
									clearTimeout(myTimeouts[i]);
								} else{
									passThrough($act,sceneId);	
								}
							},timeout);								
						
						}
					} else {				
						passThrough($act,sceneId);				
						//clean up any timer functions on scene change							
						var myInterval = setInterval(function(){							
							if($this.data('current') !== sceneId){
								clearInterval(myInterval);
							} else{
								passThrough($act,sceneId);
							}
						},$act.attr('every'));
					}
				break;
			
				case "nextScene":
					$this.nm8('runScene',$this.data('current' )+1);
				break;
				
				case "prevScene":
					$this.nm8('runScene',$this.data('current' )-1);
				break;
				
				case "runScene":									
					$this.nm8('runScene',$act.attr('sceneId'));
				break;

				default:
					console.log($act.attr('name'));
					$this.nm8($act.attr('name'),itemID,sceneId,$act);
				}
			
			});					
		},	
		
		addItem : function( id, payload,hide,width,height, top, left, zindex, onClick, parentID ){			
			var $this = $(this);			
			var strDisplay = "";	
			parentID = (parentID==null )? '.nm8Stage .lens' : '#' + parentID + '_payload' ;
			hide = (hide==null)? 0 : hide ;
			top = (top==null)? 0 : top ;
			left = (left==null)? 0 : left ;
			
			
			if(hide==1){
				strDisplay = "display:none;";
			}
			
			$(parentID).append("<div id='"+id+"_container' class='nm8Container nm8Parent' style='"+strDisplay+"width:"+width+"%;height:"+height+"%;top:"+top+"%; left:"+left+"%; z-index:"+zindex+";'><div class='nm8Bouncer'><div class='nm8Shaker'><div id='"+id+"' class='nm8Payload'>"+payload+"</div></div></div></div>");

			$('#'+id+'_container').unbind("click").click(function(){			
				$this.nm8('runItemActions','click',id);
				return false;						
			});
			
		},
			
		runItemActions : function(type,id){
			//console.log(type,id);
			var $this = $(this);
			var xml = $this.data('screenplay');				
			
			$(xml).find('inventory item[id='+id+'] '+type+'').each(function(){	
				//console.log($(this));
				$this.nm8('runActions',$(this), $this.data('current'));						
			});				
			
		},
		


/*
 ********************  Item Manipulation functions ********************************
*/


		changeClass: function(id, sceneId, obj){
			var itemContainer = '#' +id+'_container';	
			$(itemContainer).attr('class', obj.attr('className'));			
		},

		addClass: function(id, sceneId, obj){
			var itemContainer = '#' +id+'_container';	
			$(itemContainer).addClass(obj.attr('className'));			
		},

		removeClass: function(id, sceneId, obj){
			var itemContainer = '#' +id+'_container';	
			$(itemContainer).removeClass(obj.attr('className'));			
		},		
		
		show: function(id, sceneId, obj){			
			var itemContainer = '#' +id+'_container';	
			$(itemContainer).show(obj.attr('effect'),{},obj.attr('speed') );		
		},
			
		hide: function(id, sceneId, obj){			
			var itemContainer = '#' +id+'_container';		
			$(itemContainer).hide(obj.attr('effect'),{},obj.attr('speed'));	
		},			
			
		openWindow: function(id, sceneId, obj){	
			var name = (obj.attr('name')==null)? '' : obj.attr('name') ;
			var opts = (obj.attr('opts')==null)? '' : obj.attr('opts') ;
			var href = obj.attr('href') ;
			
			window.open(href,name, opts);	
		},
		
		scrollV: function(id, sceneId, obj){	
			
			var duration = obj.attr('duration');
			var itemContainer = '#' +id+'_container';			
			var $this = $(this);

			var itemHeight = $(itemContainer).height();						
			var lensHeight = $(this).height();
			var totalHeight = lensHeight + itemHeight;	
			
			var currentItemTopPosition = $(itemContainer).position().top;				
			var itemPercentage = Math.floor(( itemHeight / lensHeight )*100);				
			var maxTop = (0) - itemPercentage;			
			var timePertentage = currentItemTopPosition / totalHeight; 
			var	iterationDuration = Math.floor(duration * timePertentage);
			var destination =  maxTop;
			var start = 100;			
			
			if(obj.attr('direction') == "down"){
				destination = 100;
				start = maxTop;
				iterationDuration = Math.floor(duration * (1-timePertentage));				
			} 
			
			$(itemContainer).animate({top: ''+destination+'%'}, iterationDuration, 'linear');
			$(itemContainer).animate({top: ''+start+'%'}, 0, 'linear',function() {
				$this.nm8('scrollV',id, sceneId, obj);
			});	
			
		},

		scrollH: function(id, sceneId, obj){			
			
			var duration = obj.attr('duration');			
			var itemContainer = '#' +id+'_container';			
			var $this = $(this);
			
			var itemWidth = $(itemContainer).width();						
			var lensWidth = $(this).width();
			var totalWidth = lensWidth + itemWidth;			
			var currentItemLeftPosition = $(itemContainer).position().left;				
			var itemPercentage = Math.floor(( itemWidth / lensWidth )*100);				
			var maxLeft = (0) - itemPercentage;			
			var timePertentage = currentItemLeftPosition / totalWidth; 
			var	iterationDuration = Math.floor(duration * timePertentage);
			var destination =  maxLeft;
			
			var start = 100;			
			
			if(obj.attr('direction') == "ltr"){
				destination = 100;
				start = maxLeft;
				iterationDuration = Math.floor(duration * (1-timePertentage));				
			} 
			
			$(itemContainer).animate({left: ''+destination+'%'}, iterationDuration, 'linear');
			$(itemContainer).animate({left: ''+start+'%'}, 0, 'linear',function() {
				$this.nm8('scrollH',id, sceneId, obj);
			});				

		},
		
		move: function(id, sceneId, obj){	
			obj.attr('details','{"top":"'+obj.attr('top')+'","left":"'+obj.attr('left')+'"}');			
			var $this = $(this);
			$this.nm8('alterProperties',id,sceneId,obj );
		},
			
		alterProperties: function(id, sceneId, obj){				
			var itemContainer = '#' +id+'_container';		
			
			var animate = (obj.attr('animate')==null)? 0 : obj.attr('animate') ;
			var duration = (obj.attr('duration')==null)? 1 : obj.attr('duration') ;
			var easing = (obj.attr('easing')==null)? "swing" : obj.attr('easing') ;
			var details = jQuery.parseJSON(obj.attr('details'));
			
			if(animate==1){
				$(itemContainer).animate(details, duration, easing);	
			} else {				
				$(itemContainer).css(details);
			}
		},
	
		bounce: function(id, sceneId, obj){			
			var bounceContainer = '#'+id+'_container .nm8Bouncer';	
			var duration = obj.attr('duration');
			var step = obj.attr('step');
			var $this = $(this);			
			var myInterval = "";
			
			$(bounceContainer).animate({top:"-="+step+"%"},Math.floor(duration/2)).animate({top:"+="+step+"%"},Math.floor(duration/2));	
			if($this.data('animationSwitch')){
				myInterval = setInterval( function() {			
					if($this.data('current') !== sceneId){					
						clearInterval(myInterval);					
					} else{
						$(bounceContainer).animate({top:"-="+step+"%"},Math.floor(duration/2)).animate({top:"+="+step+"%"},Math.floor(duration/2));	
					}
				},duration);			
			}	
		},
		
		shake: function(id, sceneId, obj){
			var shakeContainer = '#'+id+'_container .nm8Shaker';
			var $this = $(this);
			var duration = obj.attr('duration');
			var step = obj.attr('step');
			var myInterval = "";			
			$(shakeContainer).animate({left:"-="+step+"%"},Math.floor(duration/2)).animate({left:"+="+step+"%"},Math.floor(duration/2));	
			if($this.data('animationSwitch')){
				myInterval = setInterval( function() {			
					if($this.data('current') !== sceneId){					
						clearInterval(myInterval);					
					} else{
						$(shakeContainer).animate({left:"-="+step+"%"},Math.floor(duration/2)).animate({left:"+="+step+"%"},Math.floor(duration/2));	
					}
				} ,duration);
			}
			
		},

		runScript: function(id, sceneId, obj){	
			var tmpFucn = new Function('id', 'sceneId', 'obj',obj.text());
			tmpFucn(id, sceneId, obj);			
		}			
		 
	};
	
	$.fn.nm8 = function(method) { 
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method == 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.nm8' );
		}
	};  

	$.fn.nm8.customMethods = {};	
	
	// plugin defaults - added as a property on our plugin function
	$.fn.nm8.defaults = {		
		screenplay: ''
	};	

})(jQuery);