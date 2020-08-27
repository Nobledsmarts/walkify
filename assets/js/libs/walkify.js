/*
 * walkify.js
 * (c) Richard franklin C
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
		this.viewElem = viewElem ? this.mount(viewElem) : null;
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
		let hash;
		let urlhash = location.hash;
	    hash = hash ?
	    hash.slice(1) : urlhash.slice(1);
	    return hash;
	}
	routeTo(url){
		location.hash = url;
		return this;
	}
	redirectTo(url, data){
		if(url in this.routes){
			this.routes[url].view = this.view.bind(this, this.routes[url], { data, redirect : true});
			this.routes[url].matched.apply(this.routes[url]);
			this.currentRoute = this.routes[url];
		}
	}
	getRoutes(){
		return Object.keys(this.routes);
	}
	mount(viewElem){
		let rootElem = document.querySelector(viewElem);
		let attribute = viewElem[0] == '.' ? 'classname' : 'id';
		if(! rootElem ) throw new Error('could not found element with ' + attribute + ' ' + viewElem.slice(1));
		this.viewElem = rootElem;
		//start listening to changes in url
		this.init();
		return this;
	}
	route(){
		let keyArr = this.getHash().split('#');
		let key = keyArr[0];
		
		if(this.routes.hasOwnProperty(key)){
			this.routes[key].view = this.view.bind(this, this.routes[key]);
			this.routes[key].matched();
			this.currentRoute = this.routes[key];
		} else {
			let routeStr = this.findRoute(key);
			if(key && routeStr){
				let keyArr = key.split('/');
				let keyArrObj = (routeStr.split('/'));
				let isTheSame = this.compare(keyArr, keyArrObj);
				if(isTheSame){
					if('matched' in this.routes[routeStr]){
						let newObj = this.buildObj(keyArr, keyArrObj);
						this.routes[routeStr].view = this.view.bind(this, this.routes[routeStr]);
						this.routes[routeStr].matched.apply(this.routes[routeStr], Object.values(newObj));
						this.currentRoute = this.routes[routeStr];
						return this;
					}
					throw new Error('walkify expected hook "matched" not found!')
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
	compare(hashArr, routesArr){
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
						let regex = new RegExp('^' + regexString + '$');
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
	closestRoute(routesArr, hashArr){
		let matchCountObj = {};
		routesArr.forEach((route) => {
			matchCountObj[route] = {
				path : route,
				count : 0
			}
			let currentRouteArr = route.split('/');
			for(let i = 0; i < currentRouteArr.length; i++){
				if((!!currentRouteArr[i]) && hashArr[i] == currentRouteArr[i]){
					matchCountObj[route]['count'] += 1;
				} 
			}
		});
		let matchCountArr = Object.keys(matchCountObj);
		if(matchCountArr.length){
			let Highestcount =  Math.max.apply(null, matchCountArr.map((route) => {
				return (matchCountObj[route]['count']);
			}));
			let closeRoute = matchCountArr.filter((route) => {
				return (matchCountObj[route]['count'] == Highestcount);
			})[0];
			let closeRouteArr = closeRoute.split('/');
			if(closeRoute[0].indexOf('*') == -1){
				// let passed = closeRouteArr.length;
				if(closeRouteArr.length == Highestcount) return closeRoute;
			}
			if(closeRoute.indexOf('*') != -1){
				let astIndex = closeRouteArr.lastIndexOf('*');
				let slicedHash = hashArr.slice(0, astIndex);
				if(closeRouteArr.slice(0, -1).join('/') == slicedHash.join('/')) return closeRoute
			}
			if(/{(.+?):(.+?)}/.test(closeRoute)){
				return closeRoute;
			}	
		}
	}
	findRoute(urlHash){
		let routes = this.routes;
		let hashArr = urlHash.split('/');
		let routesArr = Object.keys(routes);
		let routesWithSameLength = routesArr.filter((route) => {
			return route.split('/').length == hashArr.length;
		});
		let routesWithAsteriks = routesArr.filter((route) => {
			return route.endsWith('*');
		});
		if( routesWithSameLength.length ){
			return this.closestRoute(routesWithSameLength, hashArr);
		} else {
			return this.closestRoute(routesWithAsteriks, hashArr);
		}
	}
	buildObj(arr1, arr2){
		let obj = {};
		let d = [... arr1];
		let e = [... arr2];
		let filter1 = arr1.filter((el, i) => {
			return el != arr2[i];
		});
		let filter2 = e.filter((e, i) => {
			return e != d[i];
		});
		filter2.forEach((el, i) => {
			if(el.includes(':')){
				obj[el.slice(1,-1).split(':')[0]] = filter1[i];
			} else if(el.includes('}') && el.includes('{') && !(el.includes(':'))){
				obj[el.slice(1,-1)] = filter1[i];
			} else {
				obj[el] = filter1[i];
			}
		});
		return (obj);
	}
	hasTemplate(templates, viewObj){
		return templates.some((template) => {
			return template.getAttribute('for') == viewObj.name;
		});
	}
	view(viewObj, data = {}, temp){
		if(!temp  || data.redirect){
			if(!('name' in viewObj)) throw new Error('property "name" missing in route object');
			let templates = [... document.getElementsByTagName('template')];
			if( ! this.hasTemplate(templates, viewObj) ) throw new Error('template not found for current page');
			templates.forEach((template) => {
				if(template.getAttribute('for') == viewObj.name){
					this.mountView(data.redirect ? data.data : data, template);
					'mounted' in viewObj && viewObj.mounted();
					this.setLinksHandler();
				}
			}, this);
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
				return data[key];
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
}