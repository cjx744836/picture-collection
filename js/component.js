let message = Vue.extend({
    template: `
                <transition name="slide" @after-leave="remove">
                    <div class="message" v-if="visible">{{mes}}</div>
                </transition>
           `,
    data() {
        return {
            visible: false
        }
    },
    methods: {
        remove() {
            this.$el.remove();
        }
    },
    props: ['mes'],
    mounted() {
        document.body.appendChild(this.$el);
        this.$nextTick(() => {
            this.visible = true;
            setTimeout(() => {
                this.visible = false;
            }, 3000);
        });
    }
});
let tips = Vue.extend({
    template: `
                <transition name="slide" @after-leave="remove">
                    <div class="tips" v-if="visible" :style="{left:x+'px',top:y+'px'}">{{mes}}</div>
                </transition>
           `,
    data() {
        return {
            visible: false
        }
    },
    methods: {
        close() {
            this.visible = false;
        },
        remove() {
            this.$el.remove();
        }
    },
    props: ['mes', 'x', 'y'],
    mounted() {
        document.body.appendChild(this.$el);
        this.$nextTick(() => {
            this.visible = true;

        });
    }
});
Vue.directive('title', {
    bind(el, binding) {
        let vm;
        el.addEventListener('mouseover', e => {
            vm  = new tips({propsData: {mes: binding.value, x: e.clientX, y: e.clientY + 30}}).$mount();
        });
        el.addEventListener('mouseout', e => {
            vm.close();
        });
    }
});
Vue.use(VueViewer.default, {
    defaultOptions: {
        navbar: false,
        toolbar: {
            oneToOne: 1,
            reset: 1,
            prev: 1,
            next: 1,
            rotateLeft: 1,
            rotateRight: 1,
            flipHorizontal: 1,
            flipVertical: 1,
        },
        transition: false,
        title: false
    }
});
Vue.prototype.$message = function(mes) {
    return new message({
        propsData: {
            mes: mes
        }
    }).$mount();
};