### 采集指定网站的图片，仅供学习参考
多进程，一个进程负责解析html获取a标签的链接地址（默认采集链接上限为10万个会去重）和img的地址并把采集到img地址传给其它进程下载图片<BR>
采集频率设定，防止被网站屏蔽<BR>
图片大小过滤，只下载满足条件的图片<BR>
可采集指定属性的图片，除了采集src属性外，还会采集指定的属性值，比如<img data-img="xxxxxx">，有些网站的图片地址并没有放在src上，所以要指定属性采集<BR>
所有图片都会经过hash运算，防止下载到重复的图片，一键清空服务器下载的图片，下载的图片会默认放在项目路径下的img文件夹中<BR>
可以全屏，可以放大缩水，多种布局方式，内置分页忧化体验，只采集同域名下的链接
----------------------
![image](https://github.com/cjx744836/picture-collection/blob/master/img/20200604170814.jpg)
----------------------
启动 npm run start
----------------------
express默认端口6001，项目启动后，访问http://127.0.0.1:6001 <BR>
websocket默认端口3002