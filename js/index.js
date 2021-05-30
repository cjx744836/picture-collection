let ws;
let update = Viewer.prototype.update;
Viewer.prototype.update = function() {
    update.call(this);
    app.sortViewer();
};
let app = new Vue({
    el: '.app',
    data: {
        url: '',
        process: 8,
        width: '',
        arr: [],
        count: 10,
        row_count: 3,
        delay: 1000,
        ready: false,
        disabled: false,
        m_sort: false,
        m_stop: false,
        isFullScreen: false,
        isTop: false,
        m_sels_reversal: false,
        isBottom: false,
        m_sel_all: false,
        m_edit: false,
        selEdit: {},
        referer: '1',
        pageList: [],
        layoutR: '3',
        sels: {},
        dirList: [],
        delVisible: false,
        errMes: '服务器未启动',
        layoutC: '5',
        layoutListR: [
            {name: '1行',  value: '1'},
            {name: '2行',  value: '2'},
            {name: '3行',  value: '3'},
            {name: '4行',  value: '4'},
            {name: '5行',  value: '5'},
            {name: '6行',  value: '6'},
            {name: '7行',  value: '7'},
            {name: '8行',  value: '8'},
            {name: '9行',  value: '9'},
            {name: '10行',  value: '10'},
        ],
        layoutListC: [
            {name: '1列',  value: '1'},
            {name: '2列',  value: '2'},
            {name: '3列',  value: '3'},
            {name: '4列',  value: '4'},
            {name: '5列',  value: '5'},
            {name: '6列',  value: '6'},
            {name: '7列',  value: '7'},
            {name: '8列',  value: '8'},
            {name: '9列',  value: '9'},
            {name: '10列',  value: '10'},
        ],
        pager: '1',
        pageContent: [
            {name: '开', value: '1'},
            {name: '关', value: '2'}
        ],
        page: 1,
        last: 1,
        prop: '',
        size: 100,
        list: [],
        m_set_visible: false,
        cookie: '',
        reqTimeout: 5000,
        resTimeout: 60000,
        retry: 3,
        loadingVisible: false,
        only: '2',
        samePath: '2',
    },
    watch: {
        m_edit() {
            this.selEdit = {};
        },
        pager(v) {
            if(v === '2') {
                this.pageList = [];
            }
            this.page = 1;
            this.genArr();
            if(this.last > 1) {
                this.genPage();
            }
        },
        layoutC(v) {
            let pageSize = this.page * this.count * this.row_count;
            this.count = Number(v);
            this.width = 100 / this.count + '%';
            this.reCalc(pageSize);
        },
        layoutR(v) {
            let pageSize = this.page * this.count * this.row_count;
            this.row_count = Number(v);
            this.reCalc(pageSize);
        }
    },
    created() {
        this.count = Number(this.layoutC);
        this.row_count = Number(this.layoutR);
        this.width = 100 / this.count + '%';
        this.initArr();
        document.addEventListener('mousewheel', e => {
            !this.$refs.viewer.$viewer.isShown && this.scrollTop(e.deltaY)
        });
        document.addEventListener('keydown', e => {
            if(e.keyCode === 122) {
                e.preventDefault();
                this.fullScreen();
            }
            if(this.pager === '1' && !this.$refs.viewer.$viewer.isShown) {
                switch (e.keyCode) {
                    case 37:
                        this.pageTo(this.page - 1);
                        break;
                    case 39:
                        this.pageTo(this.page + 1);
                        break;
                    case 38:
                        this.scrollTop(-40);
                        break;
                    case 40:
                        this.scrollTop(40);
                        break;
                }
            }
        });
        document.addEventListener('mousemove', (e) => {
            if(e.clientY === 0 && this.isFullScreen && !this.isTop) {
                this.isTop = true;
            }
            if(e.clientY === window.innerHeight - 1 && this.isFullScreen && !this.isBottom) {
                this.isBottom = true;
            }
        });
        document.onfullscreenchange = () => {
            this.isFullScreen = !!document.fullscreenElement;
        };
    },
    methods: {
        request(ops) {
            this.loadingVisible = true;
            return new Promise((resolve, reject) => {
                fetch(ops.url, {
                    method: ops.method,
                    body: ops.param,
                    headers: {
                        'content-type': 'application/json'
                    }
                }).then(res => {
                    res.text().then(res => {
                       let data;
                        try {
                          data = JSON.parse(res);
                       } catch(e) {
                           data = res;
                       }
                       resolve(data);
                    });
                    this.loadingVisible = false;
                }).catch(err => {
                   this.loadingVisible = false;
                   reject(err);
                });
            });
        },
        pickImage(v) {
            this.request({
                method: 'post',
                url: '/pick',
                param: JSON.stringify({file: v})
            }).then(r => {
                r.code === 0 ? this.$message('success') : this.$message('failed');
            }).catch(() => {
                this.$message('failed')
            })
        },
        scrollTop(m) {
            document.documentElement.scroll(0, document.documentElement.scrollTop + m);
        },
        reCalc(pageSize) {
            this.last = Math.ceil(this.list.length / (this.count * this.row_count));
            if(pageSize > this.list.length) pageSize = this.list.length;
            this.page = Math.ceil(pageSize / (this.count * this.row_count)) || 1;
            this.genArr();
            this.genPage();
        },
        fullScreen() {
            if(document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        },
        initArr() {
            this.arr = [];
            for(let i = 0; i < this.count; i++) {
                this.arr.push([]);
            }
        },
        sortBySource() {
            if(this.m_sort) {
                this.list.sort((a, b) => {
                    return a.sUrl.localeCompare(b.sUrl);
                });
            } else {
                this.list.sort((a, b) => {
                    return b.sUrl.localeCompare(a.sUrl);
                });
            }
            this.genArr();
            this.m_sort = !this.m_sort;
        },
        sortByTime() {
            if(this.m_sort) {
                this.list.sort((a, b) => {
                    return a.create_time - b.create_time;
                });
            } else {
                this.list.sort((a, b) => {
                    return b.create_time - a.create_time;
                });
            }
            this.genArr();
            this.m_sort = !this.m_sort;
        },
        sort() {
            if(this.m_sort) {
                this.list.sort((a, b) => {
                    return a.size - b.size;
                });
            } else {
                this.list.sort((a, b) => {
                    return b.size - a.size;
                });
            }
            this.genArr();
            this.m_sort = !this.m_sort;
        },
        formatSize(size) {
            let n = size / 1024 / 1024;
            if(n > 1) return n.toFixed(0) + 'MB';
            n = size / 1024;
            return n.toFixed(0) + 'KB';
        },
        clear() {
            this.showDelDlg();
            this.request({
                url: '/dir',
                method: 'get'
            }).then(res => {
                this.dirList = res.dirs;
                this.m_sel_all = false;
                this.sels = {};
            });
        },
        dels(id) {
            this.delsImage({ids: [id]});
        },
        delsImage(data) {
            this.request({
                url: '/del',
                method: 'post',
                param: JSON.stringify(data)
            }).then(res => {
                if(res.code === 0) {
                    this.$message('删除成功');
                    data.ids.forEach(id => {
                        for(let i = 0, len = this.list.length; i < len; i++) {
                            if(this.list[i].id === id) {
                                this.list.splice(i, 1);
                                break;
                            }
                        }
                    });
                    this.selEdit = {};
                    this.m_sels_reversal = false;
                    this.last = Math.ceil(this.list.length / (this.row_count * this.count)) || 1;
                    if(this.page > this.last) this.page = this.last;
                    this.genArr();
                    this.genPage();
                } else {
                    this.$message('删除失败');
                }
            });
        },
        delSelImage() {
            let ids = Object.keys(this.selEdit);
            if(ids.length === 0) return this.$message('请选择');
            this.delsImage({ids});
        },
        selsImage() {
            if(!this.m_sels_reversal) {
                this.arr.forEach(d => {
                    d.forEach(c => {
                        this.$set(this.selEdit, c.id, true);
                    });
                });
            } else {
                this.arr.forEach(d => {
                    d.forEach(c => {
                        this.$delete(this.selEdit, c.id);
                    });
                });
            }
            this.m_sels_reversal = !this.m_sels_reversal;
        },
        editAll(id) {
            if(!this.selEdit[id]) this.$set(this.selEdit, id, true);
            else this.$delete(this.selEdit, id);
        },
        showDelDlg() {
            if(this.delVisible) return;
            this.delVisible = true;
            setTimeout(() => {
                document.addEventListener('click', this.hideDelDlg);
            });
        },
        hideDelDlg() {
            this.delVisible = false;
            document.removeEventListener('click', this.hideDelDlg);
        },
        selectAll(e) {
            this.sels = {};
            if(e.target.checked) this.dirList.forEach(d => this.$set(this.sels, d.id, true));
        },
        selectRow(e, k) {
            if(e.target.checked) this.sels[k] = true;
            else this.$delete(this.sels, k);
            this.m_sel_all = Object.keys(this.sels).length === this.dirList.length;
        },
        del(data) {
            if(data.ids.length === 0) return this.$message('请先选择');
            this.hideDelDlg();
            this.request({
                url: '/clear',
                method: 'post',
                param: JSON.stringify(data)
            }).then(res => {
                this.$message(res);
            });
        },
        delImage() {
            this.del({ids: Object.keys(this.sels)});
        },
        delImageAndDir() {
            this.del({ids: Object.keys(this.sels), s: 1});
        },
        loadImage() {
            let d = Object.keys(this.sels);
            if(d.length === 0) return this.$message('请先选择');
            this.request({
                url: '/loadImage',
                method: 'post',
                param: JSON.stringify({ids: d})
            }).then(res => {
                this.list = res.list;
                this.page = 1;
                this.genArr();
                this.last = Math.ceil(this.list.length / (this.row_count * this.count)) || 1;
                this.genPage();
                this.hideDelDlg();
            });
        },
        reset() {
            this.arr = [];
            this.list = [];
            this.pageList = [];
            this.page = 1;
            this.last = 1;
            this.m_edit = false;
            this.m_stop = false;
            for(let i = 0; i < this.count; i++) {
                this.arr.push([]);
            }
        },
        genArr() {
            this.initArr();
            if(this.pager === '1') {
                this.list.slice((this.page - 1) * this.row_count * this.count, this.page * this.row_count * this.count).forEach((d, i) => {
                    let n = i % this.count;
                    this.arr[n].length < this.row_count && this.arr[n].push(d);
                });
            } else {
                this.list.forEach((d, i) => {
                    let n = i % this.count;
                    this.arr[n].push(d);
                });
            }
        },
        sortViewer() {
            let r = Number(this.layoutR), c = Number(this.layoutC);
            let imgs = new Array(this.$refs.viewer.$viewer.images.length).fill(0);
            let images = this.$refs.viewer.$viewer.images;
            images.forEach((d, i) => {
                let n = (i / c | 0) + i % c * r;
                imgs[i] = images[n];
            })
            this.$refs.viewer.$viewer.images = imgs;
        },
        pageTo(page, i) {
            if(page === '...') {
                if(i === 1) {
                    page = this.page - 7 > 0 ? this.page - 7 : 1;
                } else {
                    page = this.page + 7 > this.last ? this.last : this.page + 7;
                }
            }
            if(page < 1) page = 1;
            else if(page > this.last - 1) page = this.last;
            if(page === this.page) return;
            this.m_sels_reversal = false;
            this.page = page;
            this.genArr();
            this.genPage();
        },
        randPage() {
            let n = (Math.random() * this.last + 1) | 0;
            this.pageTo(n);
        },
        genPage() {
            if (this.pager === '2') return;
            this.pageList = [];
            let start, end;
            if (this.last <= 7) {
                for (let i = 1; i <= this.last; i++) {
                    this.pageList.push(i);
                }
            } else {
                this.pageList.push(1);
                start = this.page - 2 > 1 ? this.page - 2 : 2;
                if(start > 2) this.pageList.push('...');
                end = this.page + 2 < this.last - 1 ? this.page + 2 : this.last - 1;
                if(this.page < 4) end = 6;
                if(this.page > this.last - 3) start = this.last - 5;
                for(let i = start; i <= end; i++) {
                    this.pageList.push(i);
                }
                if(end < this.last - 1) this.pageList.push('...');
                this.pageList.push(this.last);
            }
        },
        start() {
            if(!/^https?:\/\//.test(this.url)) return this.$message('Invalid Url');
            this.reset();
            send({
                url: this.url,
                process: this.process,
                size: this.size,
                delay: this.delay,
                prop: this.prop,
                referer: this.referer === '1' ? 1 : 0,
                cookie: this.cookie,
                reqTimeout: this.reqTimeout,
                resTimeout: this.resTimeout,
                only: this.only === '1' ? 1 : 0,
                samePath: this.samePath === '1' ? 1 : 0
            });
            this.disabled = true;
        },
        add(url) {
            if(this.list.some(d => d.id === url.id)) return;
            let n = this.list.length % this.count;
            let pageSize = this.row_count * this.count;
            if(this.pager === '1') {
                this.arr[n].length < this.row_count && this.arr[n].push(url);
            } else {
                this.arr[n].push(url);
            }
            this.list.push(url);
            let c = Math.ceil(this.list.length / pageSize);
            if(c !== this.last) {
                this.last = c;
                this.genPage();
            }
        },
        stop() {
            this.m_stop = true;
            send({stop: 1});
        },
        selAll(e) {
            e.target.select();
        }
    },
    mounted() {
    }
});
function send(o) {
    ws.send(JSON.stringify(o));
}
let once = false;
function connect() {
    ws = new WebSocket('ws://127.0.0.1:3002');
    ws.onopen = function() {
        app.disabled = false;
        app.ready = true;
        console.log('connected');
    };
    ws.onmessage = function(data) {
        let ob = JSON.parse(data.data);
        if(ob.end) return app.disabled = false;
        if(ob.err) {
            if(ob.once) {
                once = true;
                app.errMes = ob.err;
            }
            return app.$message(ob.err);
        }
        app.add(ob);
    };
    ws.onclose = function() {
        app.ready = false;
        !once && setTimeout(function() {
            connect();
        }, 5000);
    };
}
connect();