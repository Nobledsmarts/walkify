/*
 * walkify.js
 * (c) Richard franklin C [Noble Desmarts]
 * august 2020
*/
class Walkify {
	constructor(routesObj, viewElem){
		this.routes = routesObj;
		this.supportedPrefix = [
			'!', '$',  '%', '^', '*', '_', '+', '~', '-', '`', ':', '@', '#'
		];
		this.variableBracketsStart = '{{';
		this.variableBracketsEnd = '}}';
		this.variablePrefix = "\\$";
		this.previousHash = '';
		!!viewElem && this.mount(viewElem);
	}
	init(){
		window.onload = () => {
			this.navigate();
        }
		window.onhashchange = () => {
			this.navigate();
		}
		this.setLinksHandler();
	}
	//register an event on all links. makes page tracking easy
	setLinksHandler(){
		let links = document.getElementsByTagName('a');
		[... links].forEach((link) => {
			let linkHref = link.getAttribute('href');
			let isRouteLink = !(/www|http|https|ftp/ig.test(linkHref));
			if(link.hasAttribute('href') && isRouteLink){
				link.addEventListener('click', (event) => {
				linkHref = linkHref.startsWith('#') ? linkHref : '#' + linkHref;
					event.preventDefault();
					if(location.hash != linkHref ){
						'exist' in this.currentRoute && this.currentRoute.exist();
						this.previousHash = this.getHash() || '/';
						this.routeTo(linkHref);
					}
				})
			}
		});
	}
	navigate(){
		if(this.getHash()){
			this.route();
		} else {
			this.routeTo('/');
		}
	}
	getHash(){
		let urlhash = location.hash;
	    return urlhash.slice(1) ? urlhash.slice(1) : '';
	}
	routeTo(url){
		location.hash = url;
		return this;
	}
	redirectTo(url, data){
		// data = data || {};
		if(url in this.routes){
			this.routes[url].view = this.view.bind(this, this.routes[url], { data, redirect : true});
			this.routes[url].matched.apply(this.routes[url]);
			this.currentRoute = this.routes[url];
		}
	}
	getRoutes(){
		return Object.keys(this.routes);
	}

	//mount to root element
	mount(viewElem){
		let rootElem = document.querySelector(viewElem);
		let attribute = viewElem[0] == '.' ? 'classname' : 'id';
		if(! rootElem ) throw new Error('could not found element with ' + attribute + ' ' + viewElem.slice(1));
		this.viewElem = rootElem;
		this.viewSelector = viewElem;
		//start listening to changes in url
		this.init();
		return [this, rootElem];
	}

	extractUrlQuery(url){
		url = url ? url : this.getHash();
		let queryPart = url.split('?')[1];
		if(! queryPart ) return {};
		let urlArr = queryPart.split('&');
		let obj = {};
		for(let i = 0; i < urlArr.length; i++){
			let prop = urlArr[i].split('=');
			obj[prop[0]] = decodeURI(prop[1]);
		}
		return obj;
	}
	getPreviousHash(){
		return this.previousHash;
	}

	getResponseObject(queryObject, hashPartArr){
		let from = this.getPreviousHash();
		return  {
			params : queryObject,
			url : {
				to : hashPartArr[0],
				from
			}
		}
	}
	route(){
		let hashUrl = this.getHash();
		let urlHasQuery = hashUrl.indexOf('?') != -1;
		let queryObject = this.extractUrlQuery(hashUrl);
		let hashPartArr = hashUrl.split('#');
		let queryIndex = hashPartArr[0].indexOf('?');
		let hashPart = urlHasQuery ? hashPartArr[0].slice(0, queryIndex) : hashPartArr[0];
		
		if(this.routes.hasOwnProperty(hashPart)){
			let foundRoutes = Object.keys(this.routes).filter((route) => {
				if(route.endsWith('*')){
					return this.isTheSameAstRoute(route, hashPart);
				} else if(route == hashPart){
					return route;
				}
			});
			foundRoutes.forEach((route) => {
				if('matched' in this.routes[route]){
					this.routes[route].view = this.view.bind(this, this.routes[route]);
					this.routes[route].matched.call(this.routes[route], this.getResponseObject(queryObject, hashPartArr));
				} else {
					throw new Error('walkify expected hook "matched" not found!')
				}
			});
			this.currentRoute = this.routes[hashPart];			
		} else {
			let foundRoute = this.findRoute(hashPart);
			if(hashPart && foundRoute){
				let keyArr = hashPart.split('/');
				let routeArr = (foundRoute.closeRoute ? foundRoute.closeRoute.split('/') : foundRoute.split('/'));
				let isTheSame;
				if((routeArr.indexOf('*') != -1)){
					isTheSame = this.isTheSameAstRoute(routeArr.join('/'), hashPart);
				} else {
					isTheSame = this.compare(routeArr, keyArr);
				}
				if(isTheSame){
					let foundRoutes = foundRoute.routes ? foundRoute.routes : [foundRoute.closeRoute];
					foundRoutes.forEach((route) => {
						let matchedObj = this.routes[route];
						if('matched' in matchedObj){
							let newObj = this.buildObj(route.split('/'), keyArr);
							this.routes[route].view = this.view.bind(this, this.routes[route]);
							this.routes[route].matched.apply(this.routes[route], [this.getResponseObject(queryObject, hashPartArr), ...Object.values(newObj)]);
						} else {
							throw new Error('walkify expected hook "matched" not found!');
						}
					});
					this.currentRoute = this.routes[foundRoute.closeRoute];
					return this;
				}
			}
			if('!' in this.routes){
				if('matched' in this.routes['!']){
					this.routes['!'].view = this.view.bind(this, this.routes['!']);
					this.routes['!'].matched.apply(this.routes['!']);
					this.currentRoute = this.routes['!'];
				} else {
					throw new Error('walkify expected hook "matched" not found!')
				}
			}
	    }
        return this;
	}
	isTheSameAstRoute(route, hashPart){
		let hashArr = hashPart.split('/');
		let routeArr = route.split('/');
		let astIndex = routeArr.lastIndexOf('*');
		let slicedHash = hashArr.slice(0, astIndex);
		let slicedHashStr = slicedHash.join('/');
		let slicedCloseRoute = routeArr.slice(0, -1);
		let isDynamicMatch = /{(.+?):(.+?)}/.test(route);
		return isDynamicMatch ? this.compare(slicedCloseRoute, slicedHash) : slicedCloseRoute.join('/') == slicedHashStr;
	}

	compare(routesArr, hashArr){
		if(hashArr.length == routesArr.length){
			if(routesArr.indexOf('*') == -1){
				let bool = false;
				let b = routesArr.map((el, i) => {
					if(el.includes('{') && el.includes('}')){
						el = el.slice(1, -1);
					}
					if(el.includes(':')){
						bool = true;
						let regexString = el.split(':')[1];
						let regex = new RegExp('^(' + regexString + ')+$');
						return (regex.test(hashArr[i]));
					} else {
						return (el == hashArr[i]);
					}
				});
				b = b.every((el) => {
					return el == true;
				});
				return b;

			} else {
				// return (hashArr.join('').startsWith(routesArr.join('').slice(0, -1)));
			}			
		}  else {
			return (hashArr.join('').startsWith(routesArr.join('').slice(0, -1)));
		}
	}

	//returns the closest matched registered route
	closestRoute(routesArr, hashArr){
		let matchCountObj = {};
		routesArr.forEach((route) => {
			matchCountObj[route] = {
				path : route,
				count : 0
			}
			let currentRouteArr = route.split('/');

			for(let i = 0; i < currentRouteArr.length; i++){
				if((currentRouteArr[i]) && hashArr[i] == currentRouteArr[i]){
					matchCountObj[route]['count'] += 1;
					continue;
				}
			}
		});
		let matchCountArr = Object.keys(matchCountObj).filter((key) => {
			return matchCountObj[key].count;
		});
		if(matchCountArr.length){
			let Highestcount =  Math.max.apply(null, matchCountArr.map((route) => {
				return (matchCountObj[route]['count']);
			}));
			let closeRoute = matchCountArr.filter((route) => {
				return (matchCountObj[route]['count'] == Highestcount);
			})[0];
			let closeRouteArr = closeRoute.split('/');
			let isDynamicMatch = /{(.+?):(.+?)}/.test(closeRoute);
			if(closeRoute.indexOf('*') == -1){
				if(closeRouteArr.length == Highestcount) return {closeRoute};
			}
			if(closeRoute.indexOf('*') != -1){
				return {closeRoute, routes : matchCountArr};
			}
			if(isDynamicMatch){
				return {closeRoute};
			}	
		}
	}
	findRoute(urlHash){
		let routes = this.routes;
		let hashArr = urlHash.split('/');
		let routesArr = Object.keys(routes);
		let routesWithSameLength = routesArr.filter((route) => {
			return (((route.split('/').length == hashArr.length) && !!hashArr[hashArr.length - 1]) || (route.endsWith('*') && this.isTheSameAstRoute(route, urlHash)));
		});
		let routesWithAsteriks = routesArr.filter((route) => {
			return route.endsWith('*') && this.isTheSameAstRoute(route, urlHash);
		});
		if( routesWithSameLength.length ){
			return this.closestRoute(routesWithSameLength, hashArr);
		} else {
			return this.closestRoute(routesWithAsteriks, hashArr);
		}
	}
	buildObj(routeArr, hashArr){
		let obj = {};
		let filter1 = hashArr.filter((el, i) => {
			return el != routeArr[i];
		});
		let filter2 = routeArr.filter((e, i) => {
			return e != hashArr[i];
		});
		filter2.forEach((el, i) => {
			if(el.includes(':')){
				obj[el.slice(1,-1).split(':')[0]] = filter1[i];
			} else if(el.includes('}') && el.includes('{') && !(el.includes(':'))){
				obj[el.slice(1,-1)] = filter1[i];
			} else {
				// obj[el] = filter1[i];
			}
		});
		return (obj);
	}
	hasTemplate(templates, viewObj){
		return templates.some((template) => {
			return template.getAttribute('for') == viewObj.name;
		});
	}
	view(viewObj, data = {}, temp, temp2){
		data = data || {};
		if(this.typeof(data) != 'Object') throw new Error('invalid data type passed, first parameter of view method must be an object');
		if(!temp || data.redirect){
			if(!('name' in viewObj) && !data.redirect) throw new Error('property "name" missing in route object');
			let templates = [... document.getElementsByTagName('template')];
			if( !this.hasTemplate(templates, viewObj) && !data.redirect) throw new Error('template not found for current page');
			if(data.redirect && temp2){
				this.mountView(data.redirect ? (data.data || temp)  : data, temp2);
			} else {
				templates.forEach((template) => {
					if(template.getAttribute('for') == viewObj.name){
						this.mountView(data.redirect ? (data.data || temp) : data, template);
					}
				}, this);
			}
			'mounted' in viewObj && viewObj.mounted();
			this.setLinksHandler();
		} else {
			this.mountView(data, temp);
			'mounted' in viewObj && viewObj.mounted();
			this.setLinksHandler();
		}
	}
	mountView(data, template){
		let hasNoPrefix = this.noVariablePrefix;
		template = (typeof template != 'string') ? template.innerHTML : template;
		
		let regex = '[' + (hasNoPrefix ? this.supportedPrefix.join('|') : this.variablePrefix) +']' + (hasNoPrefix ? '*' : '+') + '?' + ((this.variableBracketsStart) + '+') + '(.+?)' + ((this.variableBracketsEnd) + '+');

		template = template.replace(new RegExp(regex, 'ig'), matched => {
			let key = (matched).slice(this.variableBracketsStart.length + (hasNoPrefix ? 0 : this.variablePrefix.length - 1), -this.variableBracketsEnd.length).trim();
			let hasCharLeft = (key.indexOf(this.variableBracketsEnd[0]) != - 1) || (key.indexOf(this.variableBracketsStart[0]) != - 1);
			if(key in data){
				return typeof data[key] == 'object' ? JSON.stringify(data[key]) : data[key];
			} else if((key.indexOf('[') != -1) || (key.indexOf('.') != -1)){
				try {
					let expression = 'data' + '.' + key;
					let evalExpression = eval(eval(`(expression)`));
					return typeof evalExpression == 'object' ? JSON.stringify(evalExpression) : evalExpression;
				} catch (e) {
					console.error(e);
					return undefined;
				}
			} else {
				try {
					return (eval(key));
				} catch (e) {
					if(!hasCharLeft) console.error('property : "' + key + '" not defined');
					return hasCharLeft ? matched : undefined
				}
			}
		});
		this.viewElem.innerHTML = template;
		//force dom redraw/update
		this.redrawRoot();
	}

	//methods to resolve external library conflict
	//changes the default '$' to the argument passed

	setPrefix(variablePrefix){
		variablePrefix = !variablePrefix ? variablePrefix : variablePrefix.trim();
		let isSupported = this.supportedPrefix.indexOf(variablePrefix) != -1;

		if(!isSupported && variablePrefix !== false ) throw new Error('prefix not supported');
		if((variablePrefix === false) || !variablePrefix){
			this.noVariablePrefix = true;
		}
		this.variablePrefix = '\\' + variablePrefix;
	}
	//changes the default curly braces '{{' and '}}'
	setVariableBrackets(brackets){
		if(this.typeof(brackets) != 'Array'){
			throw new Error('parameter for setVariableBrackets method must be of the type Array')
		} else if(brackets.length > 2){
			throw new Error('array should not be greater than two');
		} else if(this.typeof(brackets[0]) != 'String' || this.typeof(brackets[0]) != 'String'){
			throw new Error('character types in the array must be string')
		} else {
			this.variableBracketsStart = brackets[0];
			this.variableBracketsEnd = brackets[1];
		}
	}
	typeof(variable){
		return (variable).constructor.name;
	}
	redrawRoot(){
		let root = document.querySelector(this.viewSelector);
		if( ! (root.innerHTML == this.viewElem.innerHTML) ){
			root.innerHTML = this.viewElem.innerHTML;
		}
	}
}