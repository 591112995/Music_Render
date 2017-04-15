$(function(){
	new Visualizer().ini();
})
    
var Visualizer = function() {
    this.file = null; //要处理的文件，后面会讲解如何获取文件
    this.fileName = null; //要处理的文件的名，文件名
    this.audioContext = null;//进行音频处理的上下文，稍后会进行初始化
    this.source = null; //the audio source
    this.info = document.getElementById('info').innerHTML; //this used to 升级 the UI information
    this.infoUpdateId = null; //to sotore the setTimeout ID and clear the interval存储定时的ID清除循环间隔
    this.animationId = null;
    this.status = 0; //是否播放中
    this.forceStop = false;//强行停止
    this.allCapsReachBottom = false;//cap是否到最低点
};
Visualizer.prototype = {
    ini: function() {
        this._audio();
        this._addEventListner();
    },
    _audio: function() {
        //fix browser vender for AudioContext and requestAnimationFrame
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        try {
            this.audioContext = new AudioContext();//音频上下文类型AudioContext
        } catch (e) {
            this._updateInfo('!Your browser does not support AudioContext', false);
            console.log(e);
        }
    },
    _addEventListner: function() {
        var that = this,
            audioInput = document.getElementById('uploadedFile'),
            dropContainer = document.getElementsByTagName("canvas")[0];
        //listen the file upload
        audioInput.onchange = function() {
            if (that.audioContext===null) {return;};
            
            //the if statement fixes the file selction cancle, because the onchange will trigger even the file selection been canceled
            if (audioInput.files.length !== 0) {
                //only process the first file
                that.file = audioInput.files[0];
                that.fileName = that.file.name;
                if (that.status === 1) {
                    //the sound is still playing but we upload another file, so set the forceStop flag to true
                    //歌曲正在播放但是我们选择了另一个文件，所以我们设置强力停止为真
                    that.forceStop = true;
                };
                document.getElementById('fileWrapper').style.opacity = 1;
                that._updateInfo('Uploading', true);
                //once the file is ready,start the visualizer
                that._readfile();
            };
        };
        //listen the drag & drop
        dropContainer.addEventListener("dragenter", function() {
            document.getElementById('fileWrapper').style.opacity = 1;
            that._updateInfo('Drop it on the page', true);
        }, false);
        dropContainer.addEventListener("dragover", function(e) {
            e.stopPropagation();
            e.preventDefault();
            //set the drop mode
            e.dataTransfer.dropEffect = 'copy';
        }, false);
        dropContainer.addEventListener("dragleave", function() {
            document.getElementById('fileWrapper').style.opacity = 0.2;
            that._updateInfo(that.info, false);
        }, false);
        dropContainer.addEventListener("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (that.audioContext===null) {return;};
            document.getElementById('fileWrapper').style.opacity = 1;
            that._updateInfo('Uploading', true);
            //get the dropped file
            that.file = e.dataTransfer.files[0];
            if (that.status === 1) {
                document.getElementById('fileWrapper').style.opacity = 1;
                that.forceStop = true;
            };
            that.fileName = that.file.name;
            //once the file is ready,start the visualizer
            that._readfile();
        }, false);
    },
    _readfile: function() {
        //read and decode the file into audio array buffer 
        var that = this,
            file = this.file,
            fr = new FileReader();//实例化一个FileReader用于读取文件
        fr.onload = function(e) {   //文件读取完后调用此函数
            var fileResult = e.target.result;   //这是读取成功得到的结果ArrayBuffer数据
            var audioContext = that.audioContext; //从Visualizer得到最开始实例化的AudioContext用来做解码ArrayBuffer
            if (audioContext === null) {
                return;
            };
            that._updateInfo('Decoding the audio', true);
            audioContext.decodeAudioData(fileResult, function(buffer) { //解码成功则调用此函数，参数buffer为解码后得到的结果
                that._updateInfo('Decode succussfully,start the visualizer', true);
                that._jiema(audioContext, buffer);
            }, function(e) {
                that._updateInfo('!Fail to decode the file', false);
                console.log(e);
            });
        };
        fr.onerror = function(e) {
            that._updateInfo('!Fail to read the file', false);
            console.log(e);
        };
        //assign the file to the reader
        this._updateInfo('Starting read the file', true);
        fr.readAsArrayBuffer(file);//首先将获取的文件转换为ArrayBuffer格式，才能够传递给AudioContext进行解码
    },
    //上面已经将获取的文件进行解码，得到了audio buffer数据。接下来是设置我们的AudioContext以及获取频谱能量信息的Analyser节点
    _jiema: function(audioContext, buffer) {
        var audioBufferSouceNode = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser(),//创建获取频谱能量值的analyser节点
            that = this;
        //audioBufferSouceNode => analyser => audioContext.destination(the speaker)
        audioBufferSouceNode.connect(analyser);
        analyser.connect(audioContext.destination);//connect the analyser to the destination(the speaker), or we won't hear the sound
        audioBufferSouceNode.buffer = buffer;//把解码后的buffer数据放到上下文的buffer中
        if (!audioBufferSouceNode.start) {//play the source
            audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
            audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOn method
        };
        //stop the previous sound if any
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.source !== null) {
            this.source.stop(0);
        }
        audioBufferSouceNode.start(0);//开始播放音乐(参数是时间)
        this.status = 1;
        this.source = audioBufferSouceNode;
        audioBufferSouceNode.onended = function() {
            that._audioEnd(that);
        };
        this._updateInfo('Playing ' + this.fileName, false);
        this.info = 'Playing ' + this.fileName;
        document.getElementById('fileWrapper').style.opacity = 0.2;
        this._drawSpectrum(analyser);
    },
    _drawSpectrum: function(analyser) {
        var that = this,
            canvas = document.getElementById('canvas'),
            cwidth = canvas.width,
            cheight = canvas.height - 2,
            meterWidth = 10, //单个频谱宽度
            gap = 2, //gap between meters
            capHeight = 2,
            capStyle = '#fff',
            meterNum = 800 / (10 + 2), //频谱的数量
            capYPositionArray = []; //存储上一帧的最高点
        ctx = canvas.getContext('2d'),//内建的 HTML5 对象，拥有多种绘制路径、矩形、圆形、字符以及添加图像的方法
        gradient = ctx.createLinearGradient(0, 0, 0, 300);//竖直渲染
        gradient.addColorStop(1, '#0f0');//绿
        gradient.addColorStop(0.5, '#ff0');//黄
        gradient.addColorStop(0, '#f00');//红
        var drawMeter = function() {
            var array = new Uint8Array(analyser.frequencyBinCount);//从analyser中得到此刻的音频中各频率的能量值
            analyser.getByteFrequencyData(array);
            if (that.status === 0) {
                //fix when some sounds end the value still not back to zero
                for (var i = array.length - 1; i >= 0; i--) {
                    array[i] = 0;
                };
                allCapsReachBottom = true;
                for (var i = capYPositionArray.length - 1; i >= 0; i--) {
                    allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
                };
                if (allCapsReachBottom) {
                    cancelAnimationFrame(that.animationId); //since the sound is top and animation finished, stop the requestAnimation to prevent potential memory leak,THIS IS VERY IMPORTANT!
                    return;
                };
            };
            var step = Math.round(array.length / meterNum); //计算从analyser中的采样步长 每隔step这么长一段我们从数组中取一个值出来画
            ctx.clearRect(0, 0, cwidth, cheight);//清理画布准备画画
            for (var i = 0; i < meterNum; i++) {
                var value = array[i * step]; //获取当前能量值
                // console.log(value);
                if (capYPositionArray.length < Math.round(meterNum)) {
                    capYPositionArray.push(value);//初始化保存帽头位置的数组，将第一个画面的数据压入其中
                };
                ctx.fillStyle = capStyle;
                //draw the cap, with transition effect
                if (value < capYPositionArray[i]) { //如果当前值小于之前值
                    ctx.fillRect(i * 12, cheight - (--capYPositionArray[i]), meterWidth, capHeight);//则使用前一次保存的值来绘制帽头
                } else {
                    ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);//否则使用当前值直接绘制
                    capYPositionArray[i] = value;
                };
                ctx.fillStyle = gradient; //set the filllStyle to gradient for a better look
                ctx.fillRect(i * 12 /*频谱条的宽度+条间间距*/ , cheight - value + capHeight, meterWidth, cheight); //the meter
            }
            that.animationId = requestAnimationFrame(drawMeter);
        }
        this.animationId = requestAnimationFrame(drawMeter);
    },
    _audioEnd: function(instance) {
        if (this.forceStop) {
            this.forceStop = false;
            this.status = 1;
            return;
        };
        this.status = 0;
        var text = 'HTML5 Audio API showcase | An Audio Viusalizer';
        document.getElementById('fileWrapper').style.opacity = 1;
        document.getElementById('info').innerHTML = text;
        instance.info = text;
        document.getElementById('uploadedFile').value = '';
    },
    _updateInfo: function(text, processing) {
        var infoBar = document.getElementById('info'),
            dots = '...',
            i = 0,
            that = this;
        infoBar.innerHTML = text + dots.substring(0, i++);
        if (this.infoUpdateId !== null) {
            clearTimeout(this.infoUpdateId);
        };
        if (processing) {
            //animate dots at the end of the info text
            var animateDot = function() {
                if (i > 3) {
                    i = 0
                };
                infoBar.innerHTML = text + dots.substring(0, i++);
                that.infoUpdateId = setTimeout(animateDot, 250);
            }
            this.infoUpdateId = setTimeout(animateDot, 250);
        };
    }
}