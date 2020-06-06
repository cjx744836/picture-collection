class ChildManager {
    constructor() {
        this.childs = [];
        this.count = 0;
        this.cb = [];
    }
    add(child) {
        this.childs.push(child);
    }
    onOver(cb) {
       typeof cb === 'function' && this.cb.push(cb);
    }
    kill(child) {
        this.count++;
        child.kill();
        if(this.count >= this.childs.length) {
            this.cb.forEach(cb => cb());
            this.clear();
        }
    }
    over() {
        this.childs.forEach(child => {
            child.emit('over');
        });
    }
    clear() {
        this.childs = [];
        this.cb = [];
        this.count = 0;
    }
    killAll() {
        this.childs.forEach(child => {
           child.emit('kill');
        });
    }
}

module.exports = new ChildManager();