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
			this.navigate({
				loadtype : 'onload'
			});
        }
		window.onhashchange = () => {
			this.navigate({
				loadtype : 'hashchange'
			});
		}
	}
	 setMutationObserver(){
		let body = document.querySelector('body');
		let config = {childList : true, subtree : true};
		let callback = (mutationList, observer) => {
			for(let mutation of mutationList){
				if(mutation.type == 'childList'){
					if(mutation.target.tagName == 'A'){
						this.setLinksHandler(mutation.target);
					}
					else if(mutation.addedNodes.length){
						[... mutation.addedNodes].forEach((el) => {
							if(el.tagName == 'A'){
								this.setLinksHandler(el);
							}
						});
					}
				}
			}
		}
		this.observer = new MutationObserver(callback);
		this.observer.observe(body, config);
	 }
	
	setLinksHandler(link){
		let links = link ? [link] : [... document.getElementsByTagName('a')];
		links.forEach((link) => {
			let linkHref = link.getAttribute('href');
			let isSameOrigin = null;
			try {
				let newUrl = new URL(linkHref);
				isSameOrigin = newUrl.origin == location.origin;
			} catch (e){
				isSameOrigin = !(/^((http|https|ftp):\/\/)*(www\.)*(.+?)\.[a-y]{2,}$/ig.test(linkHref));
			}
			let hasDownloadAttr = link.hasAttribute('download');
			let hasTargetAttr = link.hasAttribute('target');
			let hasExternalRel = link.hasAttribute('rel') ? link.getAttribute('rel').toLowerCase() == 'external' : false;

			let isExternalLink = hasDownloadAttr || hasTargetAttr || hasExternalRel || !isSameOrigin;

			if(link.hasAttribute('href') && !isExternalLink){
				link.addEventListener('click', (event) => {
				linkHref = linkHref.startsWith('#') ? linkHref : '#' + linkHref;
					event.preventDefault();
					if(location.hash != linkHref ){
						'exist' in this.currentRoute && this.currentRoute.exist();
						this.routeTo(linkHref);
					}
				})
			} else {
				link.addEventListener('click', (event) => {
					event.preventDefault();
					if( !(/^((http|https|ftp):\/\/)(.+?)\.[a-y]{2,}$/ig.test(linkHref)) ){
						try{
							location.href = 'http://' + linkHref;
						} catch(e){
							'exist' in this.currentRoute && this.currentRoute.exist();
							this.routeTo(linkHref);
						}
						return;
					} 
					location.href = linkHref;
				})
			}
		});
	}
	
	getAppHistoryObj(){
		return sessionStorage.appHistoryObj ? JSON.parse(sessionStorage.appHistoryObj) : {
			history : [],
			current : 0,
			length : 0
		};
	}
	navigate(options){
		if(this.getHash()){
			if(options.loadtype == 'hashchange'){
				let appHistory = this.getAppHistoryObj().history;
				appHistory.push(this.getHash());
				sessionStorage.appHistoryObj = JSON.stringify({
					history : appHistory,
					current : appHistory.length - 1,
					length : appHistory.length - 1
				});
			} else {
				if(! sessionStorage.appHistoryObj ){
					sessionStorage.appHistoryObj = JSON.stringify({
						history : [this.getHash()],
						current : 1,
						length : 1
					});
				}
			}
			this.setPreviousHash();
			this.route(options);
		} else {
			this.routeTo('/');
		}
	}
	getHash(url){
		let urlhash = url ? '#' + url.split('#')[1] : location.hash;
	    return urlhash.slice(1) ? urlhash.slice(1) : '';
	}
	routeTo(url){
		this.setPreviousHash();
		location.hash = url;
		return this;
	}
	setPreviousHash(){
		let history = sessionStorage.appHistoryObj ? JSON.parse(sessionStorage.appHistoryObj).history : [];
		if(history.length == 1){
			this.previousHash = '';
		} else {
			this.previousHash = history.slice(-2)[0];
		}
	}
	redirectTo(url, redirectData){
		let [, , hashPart] = Object.values(this.getRouteObject(url));
		if(hashPart in this.routes){
			if(this.routes.hasOwnProperty(hashPart)){
				this.checkNormalRoute(true, redirectData);
			} else {
				this.checkDynamicRoute(true, redirectData);
			}
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
		
		//start listening to dom changes
		this.setMutationObserver();
		return this
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

	getResponseObject(optionsObj){
		let from = this.getPreviousHash();
		return  {
			params : optionsObj.queryObject,
			url : {
				to : optionsObj.hashPartArr[0],
				from,
				redirect : optionsObj.redirect ? optionsObj.redirect : false,
				path : optionsObj.hashPart
			}
		}
	}
	currentResponseObject(){
		let [queryObject, hashPartArr, hashPart] = Object.values(this.getRouteObject());
		return getResponseObject({queryObject, hashPartArr, hashPart});
	}
	getRouteObject(url){
		let hashUrl = url ? url.toLowerCase() : this.getHash().toLocaleLowerCase();
		let urlHasQuery = hashUrl.indexOf('?') != -1;
		let queryObject = this.extractUrlQuery(hashUrl);
		let hashPartArr = hashUrl.split('#');
		let queryIndex = hashPartArr[0].indexOf('?');
		let hashPart = urlHasQuery ? hashPartArr[0].slice(0, queryIndex) : hashPartArr[0];
		return {
			queryObject,
			hashPartArr,
			hashPart
		}
	}
	checkNormalRoute(isRedirect, redirectData){
		let routeObject = this.getRouteObject();
		let hashPart = routeObject.hashPart;
		let queryObject = routeObject.queryObject;
		let hashPartArr = routeObject.hashPartArr;
		let foundRoutes = this.getRoutes().filter((route) => {
			if( isRedirect ){
				return route == hashPart;
			} else {
				if(route.endsWith('*')){
					return (this.isTheSameAstRoute(route, hashPart));
				} else {
					return route == hashPart;
				}
			}
		});
		foundRoutes.forEach((route) => {
			if('matched' in this.routes[route]){
				if( !isRedirect ){
					this.routes[route].view = this.view.bind(this, this.routes[route]);
					this.routes[route].matched.call(this.routes[route], this.getResponseObject({queryObject, hashPartArr, hashPart}));
				} else {
					this.routes[route].view = this.view.bind(this, this.routes[route], { data : redirectData, redirect : true});
					this.routes[route].matched.call(this.routes[route], this.getResponseObject({queryObject, hashPartArr, hashPart, redirect : true}));
				}
				
			} else {
				throw new Error('walkify expected hook "matched" not found!')
			}
		});
		if( !isRedirect ) {
			this.currentRoute = this.routes[hashPart];
		}
	}
	checkDynamicRoute(isRedirect, redirectData){
		let [queryObject, hashPartArr, hashPart] = Object.values(this.getRouteObject());
		let foundRoute = this.findRoute(hashPart, isRedirect);
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
						if( !isRedirect ){
							this.routes[route].view = this.view.bind(this, this.routes[route]);
							this.routes[route].matched.apply(this.routes[route], [this.getResponseObject({queryObject, hashPartArr, hashPart}), ...Object.values(newObj)]);
						} else {
							this.routes[route].view = this.view.bind(this, this.routes[route], { data : redirectData, redirect : true});
							this.routes[route].matched.apply(this.routes[route], [this.getResponseObject({queryObject, hashPartArr, hashPart, redirect : true}), ...Object.values(newObj)]);
						}
						
					} else {
						throw new Error('walkify expected hook "matched" not found!');
					}
				});
				if( !isRedirect ){
					this.currentRoute = this.routes[foundRoute.closeRoute];
					return this;
				}
			}
		}
		!isRedirect && this.routeTo404(queryObject, hashPartArr, hashPart);
	}
	routeTo404(queryObject, hashPartArr, hashPart){
		if('!' in this.routes){
			if('matched' in this.routes['!']){
				this.routes['!'].view = this.view.bind(this, this.routes['!']);
				this.routes['!'].matched.apply(this.routes['!'], [this.getResponseObject({queryObject, hashPartArr, hashPart})]);
				this.currentRoute = this.routes['!'];
			} else {
				throw new Error('walkify expected hook "matched" not found!')
			}
		}
	}
	route(options){
		let hashPart = this.getRouteObject().hashPart;
		if(this.routes.hasOwnProperty(hashPart)){
			this.checkNormalRoute();
		} else {
			this.checkDynamicRoute();
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
		
		return isDynamicMatch ? this.compare(slicedCloseRoute, slicedHash) : (astIndex > 0 ? slicedCloseRoute.join('/') == slicedHashStr : route == hashPart);
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
					return el === true;
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
			});
			//routes with asteriks has higher priority
			closeRoute = closeRoute.length > 1 ? closeRoute.filter((route) => {
				return route.indexOf('*') != -1;
			})[0] || closeRoute[0] : closeRoute[0];

			let closeRouteArr = closeRoute.split('/');
			let isDynamicMatch = /{(.+?):(.+?)}/.test(closeRoute);
			if(closeRoute.indexOf('*') == -1){
				if((closeRouteArr.length == Highestcount) && closeRoute == hashArr.join('')) return {closeRoute};
			}
			if(closeRoute.indexOf('*') != -1){
				matchCountArr = matchCountArr.filter((route) => {
					return this.isTheSameAstRoute(route, hashArr.join('/'));
				});
				return {closeRoute, routes : matchCountArr};
			}
			if(isDynamicMatch){
				return {closeRoute};
			}	
		}
	}
	findRoute(urlHash, isRedirect){
		let hashArr = urlHash.split('/');
		let routesArr = this.getRoutes();
		let routesWithSameLength = routesArr.filter((route) => {
			if( !isRedirect ){
				return (((route.split('/').length == hashArr.length) && !!hashArr[hashArr.length - 1]) || (route.endsWith('*') && this.isTheSameAstRoute(route, urlHash)));
			} else {
				return (((route.split('/').length == hashArr.length) && !!hashArr[hashArr.length - 1]));
			}
		});
		let routesWithAsteriks = routesArr.filter((route) => {
			return route.endsWith('*') && this.isTheSameAstRoute(route, urlHash);
		});
		
		if( routesWithSameLength.length ){
			return this.closestRoute(routesWithSameLength, hashArr);
		} else {
			if( !isRedirect ) return this.closestRoute(routesWithAsteriks, hashArr);
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
			if( !data.redirect ){
				try {
					'mounted' in viewObj && viewObj.mounted();
				} catch(e){
					console.error(e);
				}
			} 
		} else {
			this.mountView(data, temp);
			try {
				'mounted' in viewObj && viewObj.mounted();
			} catch(e){
				console.error(e);
			}
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
			} else if((/\.|\[|\]/ig.test(key))){
				try {
					let expression = 'data' + '.' + key;
					let evalExpression = eval(eval(`(expression)`));
					return typeof evalExpression == 'object' ? JSON.stringify(evalExpression) : evalExpression;
				} catch (e) {
					console.error(e);
					return '';
				}
			} else {
				try {
					return (eval(key));
				} catch (e) {
					if(!hasCharLeft) console.error('property : "' + key + '" not defined');
					return hasCharLeft ? matched : ''
				}
			}
		});
		this.viewElem.innerHTML = template;
		//force dom redraw/update
		this.redrawRoot();
		this.setLinksHandler();
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