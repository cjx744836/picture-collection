class ChildManager {
    constructor() {
        this.childs = [];
        this.count = 0;
        this.cb = null;
    }
    add(child) {
        this.childs.push(child);
    }
    onOver(cb) {
       this.cb = cb;
    }
    kill(child) {
        this.count++;
        child.kill();
        if(this.count >= this.childs.length) {
            this.clear();
            typeof this.cb === 'function' && this.cb();
        }
    }
    over() {
        this.childs.forEach(child => {
            child.emit('over');
        });
    }
    clear() {
        this.childs = [];
        this.count = 0;
    }
    killAll() {
        this.childs.forEach(child => {
           child.emit('kill');
        });
    }
}

module.exports = new ChildManager();