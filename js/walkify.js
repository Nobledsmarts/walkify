/*
 /* walkify.js
 /* (c) Richard franklin C
 /* august 2020
*/
class Walkify {
	constructor(routesObj, viewElem){
		this.routes = routesObj;
		this.viewElem = viewElem;
		this.init();
	}
	init(){
        window.onload = () => {
			this.navigate();
        }
		window.onhashchange = () => {
			this.navigate();
		}
		let links = document.getElementsByTagName('a');
		[... links].forEach((link) => {
			let linkHref = link.getAttribute('href');
			linkHref = linkHref.startsWith('#') ? linkHref : '#' + linkHref;
			let isRouteLink = !(/www|http|https|ftp/ig.test(linkHref));
			if(link.hasAttribute('href') && isRouteLink){
				link.addEventListener('click', (event) => {
					event.preventDefault();
					if(location.hash != linkHref ){
						'exist' in this.currentRoute && this.currentRoute.exist();
						this.routeTo(linkHref)
					}
				})
			}
		})
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
	mount(elem){
		this.viewElem = document.querySelector(elem);
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
			let Lkey = this.findObj(key);
			if(key && Lkey){
				let keyArr = key.split('/');
				let keyArrObj = (Lkey.split('/'));
				let isTheSame = this.compare(keyArr, keyArrObj);
				if(isTheSame){
					if('matched' in this.routes[Lkey]){
						let newObj = this.buildObj(keyArr, keyArrObj);
						this.routes[Lkey].view = this.view.bind(this, this.routes[Lkey]);
						this.routes[Lkey].matched.apply(this.routes[Lkey], Object.values(newObj));
						this.currentRoute = this.routes[Lkey];
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
	compare(arr1, arr2){
		let len = arr1.length == arr2.length;
		let p = arr2.slice(1, -1).every((el) => {
			return el.includes('{') && el.includes('}') && !(el.includes(':'))
		});
	  	if(arr1.length && arr2.length){
			if(arr2.includes('*')){
				let str = arr2.join('/').replace('*', '');
				let str2 = arr1.join('/');
				if(str2.indexOf(str) != -1){
					return true
				}
			} else {
				let bool = false;
				let b = arr2.map((el, i) => {
					if(el.includes('{') && el.includes('}')){
					el = el.slice(1, -1);
					}
					if(el.includes(':')){
						bool = true;
						let regItem = el.split(':')[1];
						let reg = new RegExp('^' + regItem + '$');
						return (reg.test(arr1[i]));
					} else {
						return (el == arr1[i]);
					}
				});
				b = b.every((el) => {
					return el == true;
				});
				if(!bool) return len && arr1.join('') == arr2.join('');
				if(p) return p && len;
				return b && len;
			}
		  }
		  if(p && arr1.length == arr2.length){
			return true;
		};
	  	return false;
	}
	findObj(urlH){
		let routesArr = Object.keys(this.routes);
		let hashArr = urlH.split('/');
		let arr;
		let key;	
        for(let i = 0; i < routesArr.length; i++){
			let listenArr = routesArr[i].split('/');
			let h = [];
			arr = [...hashArr];
        	if(routesArr[i] == '*' || routesArr[i] == '!'){
				continue;
			}
			let a = listenArr;
			let b = a.filter((el) => {
				return !(el.includes('{'))
			});
            for(let i = 0; i < arr.length; i++){
                for(let v = 0; v < b.length; v++){
                  if(arr[i] == b[v]){
					   h.push(arr[i]);
				  }
				}
			}
			if(JSON.stringify(b) == JSON.stringify(h)){
                let bool = this.compare(hashArr, listenArr);
				if(bool){
                    key = routesArr[i];
				}
			}
			else if(this.compare(hashArr, listenArr)){
				let bool = this.compare(hashArr, listenArr);
				if(bool){
					key = routesArr[i];
				}
				return key;
			}
			else{
				if(hashArr.length == listenArr.length){
					let p = listenArr.slice(1, -1).every((el) => {
					if(el.includes('{') && el.includes('}') && !(el.includes(':'))){
						key = routesArr[i];
					}
				});
					return key;
				}
				if(b.includes('*')){
					let k = (routesArr[i].slice(0, -1));
					let bool = this.compare(hashArr, k.split('/'));
					if(bool){
						key = routesArr[i];
					} 
				}
			}
		}
		return key ? key : false;
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
	view(viewObj, data = {}, temp){
		if(!temp  || data.redirect){
			if(!('name' in viewObj)) throw new Error('property "name" missing in route object');
			let templates = document.getElementsByTagName('template');
			[... templates].forEach((template) => {
				if(template.getAttribute('for') == viewObj.name){
					this.mountView(data.redirect ? data.data : data, template);
					'mounted' in viewObj && viewObj.mounted();
				}
			}, this);
		} else {
			this.mountView(data, temp);
			'mounted' in viewObj && viewObj.mounted();
		}
	}
	mountView(data, template){
		template = (typeof template != 'string') ? template.innerHTML : template;
		template = template.replace(/\${{(.+?)}}/ig, matched => {
			let key = matched.slice(3, -2).trim();
			if(key in data){
				return data[key];
			} else {
				try {
					return (eval(key));
				} catch (e) {
					// throw new Error('property : "' + key + '" not defined')
					return undefined
				}
			}
		});
		this.viewElem.innerHTML = template;
	}
}