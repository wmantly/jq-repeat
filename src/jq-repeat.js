/*
Author William Mantly Jr <wmantly@gmail.com>
https://github.com/wmantly/jq-repeat
MIT license
*/

(function($, Mustache){
'use strict';
	if (!$.scope) {
		$.scope = {};
	}
	
	var make = function( element ){
		var result = [];

		result.splice = function(inputValue, ...args){
			//splice does all the heavy lifting by interacting with the DOM elements.

			var toProto = [...args]

			var index;
			//if a string is submitted as the index, try to match it to index number
			if( typeof arguments[0] === 'string' ){
				index = this.indexOf( arguments[0] );//set where to start
				if ( index === -1 ) {
					return [];
				}
			}else{
				index = arguments[0]; //set where to start
			}

			toProto.unshift(index)

			var howMany = arguments[1]; //sets the amount of fields to remove
			var args = Array.prototype.slice.call( arguments ); // coverts arguments into array 
			var toAdd = args.slice(2); // only keeps fields to add to array

			// if the starting point is higher then the total index count, start at the end
			if( index > this.length ) {
				index = this.length;
			}
			// if the starting point is negative, start form the end of the array, minus the start point
			if( index < 0 ) {
				index = this.length - Math.abs( index );
			}

			// if there are things to add, figure out the how many new indexes we need
			if( !howMany && howMany !== 0 ) {
				howMany = this.length - index;
			}
			//not sure why i put this here... but it does matter!
			if( howMany > this.length - index ) {
				howMany = this.length - index;
			}

			//figure out how many positions we need to shift the current elements
			var shift = toAdd.length - howMany;

			// figure out how big the new array will be
			// var newLength = this.length + shift;

			//removes fields from array based on howMany needs to be removed
			for( var i = index; i < +index+howMany; i++ ) {
				this.__take(this[index].__jq_$el, this[index], this);
				// this.__take.apply( $( '.jq-repeat-'+ this.__jqRepeatId +'[jq-repeat-index="'+ ( i + index ) +'"]' ) );
			}

			//re-factor element index's
			for(var i = 0; i < this.length; i++){
				if(  i >= index){

					this[i].__jq_$el.attr( 'jq-repeat-index', i+shift );
				}
			}

			//if there are fields to add to the array, add them
			if( toAdd.length > 0 ){

				//$.each( toAdd, function( key, value ){
				for(var I = 0; I < toAdd.length; I++){
					
					//figure out new elements index
					var key = I + index;
					// apply values to template
					var render = Mustache.render(this.__jqTemplate, toAdd[I]);
					
					//set call name and index keys to DOM element
					var $render = $( render ).addClass( 'jq-repeat-'+ this.__jqRepeatId ).attr( 'jq-repeat-index', key );

					//if add new elements in proper stop, or after the place holder.
					if( key === 0 ){
						this.$this.after( $render );
					}else{
						$( '.jq-repeat-'+ this.__jqRepeatId +'[jq-repeat-index="' + ( key -1 ) + '"]' ).after( $render );
					}

					Object.defineProperty( toAdd[I], "__jq_$el", {
						value: $render,
						writable: true,
						enumerable: false,
						configurable: true
					} );
					
					//animate element
					this.__put($render, toAdd[I], this);
				}
			}
			
			//set and return new array
			return Array.prototype.splice.apply(this, toProto);
		};
		result.push = function(){
			//add one or more objects to the array

			//set the index value, if none is set make it zero
			var index = this.length || 0;
			
			//loop each passed object and pass it to slice
			for (var i = 0 ; i < arguments.length; ++i) {
				this.splice( ( index + i ), 0, arguments[i] );
			}

			//return new array length
			return this.length;
		};
		result.pop = function(){
			//remove and return array element

			return this.splice( -1, 1 )[0];
		};
		result.reverse = function() {
			var temp = this.splice( 0 );
			Array.prototype.reverse.apply( temp );

			for( var i = 0; i < temp.length; i++ ){
				this.push( temp[i] );
			}

			return this;
		};

		result.remove = function(key, value){
			let index = this.indexOf(key, value)
			if(index === -1) return;
			this.splice(index, 1)
		}

		result.shift = function() {
			return this.splice( 0, 1 )[0];
		};

		result.loop = function(){
			var temp = this[0];
			this.splice( 0,1 );
			this.push( temp );

			return temp;
		};
		result.loopUp = function(){
			var temp = this[this.length-1];
			this.splice( -1, 1 );
			this.splice( 0, 0, temp );
			return temp;
		};
		result.indexOf =  function( key, value ){
			if( typeof value !== 'string' ){
				value = arguments[0];
				key = this.__index;
			}
			for ( var index = 0; index < this.length; ++index ) {
				if( this[index][key] === value ){

					return index;
				}
			}
			return -1;
		};
		result.update = function( key, value, update ){
			//set variables using sting for index

			// If update is called with no index/key, assume its the 0
			if(typeof key === 'object'){
				if(this[0]){
					return this.update(0, key);
				}
				return this.splice(0, 1, key);
			}

			if( typeof value !== 'string' ){
				update = arguments[1];
				value = arguments[0];
				key = this.__index;
			}
			var index = this.indexOf( key, value );
			if(index === -1) {
				return [];
			}
			var object = $.extend( true, {}, this[index], update );
 
			var $render = $(Mustache.render(this.__jqTemplate, object));
			$render.attr('jq-repeat-index', index);
			this[index].__jq_$el.replaceWith($render);

			this[index].__jq_$el = $render;
			this.__update(this[index].__jq_$el, this[index], this);
		};
		
		result.getByKey = function(key, value){
			return this[this.indexOf(key, value)];
		}

		result.__put = function($el, item, list){
			$el.show();
		};

		result.__take = function($el, item, list){
			$el.remove();
		};

		result.__update = function($el, item, list){
			console.log('here', $el)
			$el.show();
		};

		result.__setPut = function(fn) {
			Object.defineProperty(this, '__put', {
				value: fn,
				writable: true,
				enumerable: false,
				configurable: true
			});
		};

		result.__setTake = function(fn) {
			Object.defineProperty(this, '__take', {
				value: fn,
				writable: true,
				enumerable: false,
				configurable: true
			});
		};

		result.__setUpdate = function(fn) {
			Object.defineProperty(this, '__update', {
				value: fn,
				writable: true,
				enumerable: false,
				configurable: true
			});
		};

		var $this = $( element ); 
		result.__jqRepeatId = $this.attr( 'jq-repeat' );
		$this.removeAttr('jq-repeat');
		result.__index = $this.attr('jq-repeat-index');
		result.__jqTemplate = $this[0].outerHTML;
		$this.replaceWith( '<script type="x-tmpl-mustache" id="jq-repeat-holder-' + result.__jqRepeatId + '"><\/script>' );
		result.$this = $('#jq-repeat-holder-' + result.__jqRepeatId);

		Mustache.parse(result.__jqTemplate);   // optional, speeds up future uses

		for(let key in result){
			Object.defineProperty(result, key, {
				value: result[key],
				writable: true,
				enumerable: false,
				configurable: true
			});
		}

		$.scope[result.__jqRepeatId] = result;
	};

	$( document ).ready( function(){
		$( '[jq-repeat]' ).each(function(key, value){
			make(value);
		});

		$(document).on('DOMNodeInserted', function(e) {
			if ( $(e.target).is('[jq-repeat]') ){
				make( e.target );
			}else{
				var t = $(e.target).find('[jq-repeat]');
				t.each(function(key, value){
					make(value);
				});
			}
		});
	} );

})(jQuery, Mustache);
