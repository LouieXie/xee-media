import xeeUtils from 'xee-utils';
import jQuery from 'jquery';

const {Base, Events, raf, support} = xeeUtils;
const $ = jQuery;

// 是否支持多媒体
const IS_SUPPORT_MEDIA = typeof support.media != 'undefined' ? support.media : (function () {
    let video = document.createElement('video');
    let audio = document.createElement('audio');
    return !!video.play && !!audio.play;
})();

const CAN_PLAY_THROUGH = 1;
const CAN_PLAY = 0;

// 判断是否已加载时长与全部时长之间的差值是否小于这个值
const DELTA = .5;

class MyMedia extends Base {

    constructor (opt) {
        super();

        this.__options__ = {
            time: xeeUtils.isNumber(opt.time) ? opt.time : 0,
            volume: xeeUtils.isNumber(opt.volume) ? opt.volume : 1,
            autoplay: xeeUtils.isBoolean(opt.autoplay) ? opt.autoplay : false,
            loop: xeeUtils.isBoolean(opt.loop) ? opt.loop : false,
            preload: xeeUtils.isBoolean(opt.preload) ? opt.preload : false,
            doneTime: opt.doneTime || CAN_PLAY
        };

        this.__isLoading__ = false;
    }

    /*
        初始化相关配置，由子类在声明好$media后调用
        @private
    */
    __init__ () {
        this.__bind__();

        this.time(this.__options__.time);
        this.volume(this.__options__.volume);
        this.__options__.loop ? this.$media.attr('loop', true) : this.$media.removeAttr('loop')
        if (this.__options__.preload) {
            this.__loadMedia__();
        } else {
            this.$media.attr('preload', 'none');
        }
        this.__options__.autoplay && this.play();
    }

    __bind__ () {
        let media = this.$media[0];
        let isDone = false;
        let isWaitToPlay = false;

        this.__events__ = new Events();

        this.__events__.on('playIfDone', () => {
            if (isDone) {
                this.__delayPlay__();
            } else {
                this.__loadMedia__();
                isWaitToPlay = true;
            }
        });

        this.__events__.on('pause', () => {
            this.__pause__();
            isWaitToPlay = false;
        });

        this.__events__.on('done', () => {
            this.$media.removeClass('media--loading');
            isDone = true;
            if (isWaitToPlay) {
                this.__delayPlay__();
            }
        });

        this.__events__.on('loading', () => {
            this.$media.addClass('media--loading');
        });

        this.__events__.on('done', () => {
            this.$media
            .on('ended', e => {
                this.__events__.emit('ended', e);
            })
            .on('timeupdate', e => {
                this.__events__.emit('timeupdate', e);
            })
        })
    }

    __loadMedia__ () {
        if (this.__isLoading__) return false;
        this.__isLoading__ = true;

        let _this = this;
        let media = this.$media[0];
        let doneTime = _this.__options__.doneTime;
        let loadRAFId = -1;

        if ((doneTime == CAN_PLAY && (media.readyState === media.HAVE_FUTURE_DATA || media.readyState == media.HAVE_ENOUGH_DATA)) || 
            (doneTime == CAN_PLAY_THROUGH && media.readyState == media.HAVE_ENOUGH_DATA)) {
            _this.__done__();
        } else {
            media.preload = 'auto';

            let initVolume = _this.volume();
            let initTime = _this.time();

            // 当需要加载全部资源时，如果视频非播放状态，只会加载前面部分文件资源。需要视频处于播放状态，才会加载全部文件资源
            _this.volume(0);
            _this.__delayPlay__();
            _onLoad();

            function _onLoad () {
                let current = 0;
                let duration = media.duration;

                if (media.buffered && media.buffered.length) {
                    current = media.buffered.end(0);
                }

                if ((doneTime == CAN_PLAY_THROUGH && current > 0 && current >= duration - DELTA) || (doneTime == CAN_PLAY && current > 0)) {
                    _this.__pause__();
                    _this.time(initTime);
                    _this.volume(initVolume);
                    _this.__done__();
                    return true;
                }

                _this.__events__.emit('loading', current, duration)

                loadRAFId = raf(_onLoad);
            }
        }
    }

    // Uncaught (in promise) DOMException: The play() request was interrupted by a call to pause().
    __delayPlay__ () {
        let media = this.$media[0];

        media.paused && media.play(); 
        this.__events__.emit('play');
    }

    __pause__ () {
        let media = this.$media[0];

        !media.paused && media.pause();
    }

    __done__ () {
        setTimeout(()=>{
            this.__events__.emit('done');
        })
    }

    getElement () {
        return this.$media[0];
    }

    play () {
        if (!IS_SUPPORT_MEDIA) return this;

        this.__events__.emit('playIfDone');

        return this;
    }

    pause () {
        if (!IS_SUPPORT_MEDIA) return this;

        this.__events__.emit('pause');

        return this;
    }

    reset () {
        if (!IS_SUPPORT_MEDIA) return this;

        this.time(0);
        this.pause();

        return this;
    }

    replay () {
        if (!IS_SUPPORT_MEDIA) return this;

        this.time(0);
        this.play();

        return this;
    }

    time (val) {
        if (!IS_SUPPORT_MEDIA) return false;

        if (xeeUtils.isNumber(val)) {
            try {
                this.$media[0].currentTime = val;
            } catch (e) {
                return false
            }

            return true;
        }

        return this.$media[0].currentTime;
    }

    volume (val) {
        if (!IS_SUPPORT_MEDIA) return false;

        if (xeeUtils.isNumber(val)) {
            this.$media[0].volume = val;

            return true;
        }

        return this.$media[0].volume;
    }

    onPlay (cb) {
        if (!IS_SUPPORT_MEDIA) {
            return false;
        }

        this.__events__.on('play', cb);

        return () => {
            this.__events__.off('play', cb);
        };
    }

    onPause (cb) {
        if (!IS_SUPPORT_MEDIA) {
            return false;
        }

        this.__events__.on('pause', cb);

        return () => {
            this.__events__.off('pause', cb);
        };
    }

    onDone (cb) {
        if (!IS_SUPPORT_MEDIA) {
            return false;
        }

        this.__events__.on('done', cb);

        return () => {
            this.__events__.off('done', cb);
        }
    }

    onLoading (cb) {
        if (!IS_SUPPORT_MEDIA) {
            return false;
        }

        this.__events__.on('loading', cb);

        return () => {
            this.__events__.off('loading', cb);
        }
    }

    onEnd (cb) {
        if (!IS_SUPPORT_MEDIA) {
            return false;
        }

        this.__events__.on('ended', cb)

        return () => {
            this.__events__.off('ended', cb);
        };
    }

    onTimeUpdate (cb) {
        if (!IS_SUPPORT_MEDIA) {
            return false;
        }

        this.__events__.on('timeupdate', cb);

        return () => {
            this.__events__.off('timeupdate', cb);
        }
    }

}

MyMedia.IS_SUPPORT_MEDIA = IS_SUPPORT_MEDIA;
MyMedia.CAN_PLAY_THROUGH = CAN_PLAY_THROUGH;
MyMedia.CAN_PLAY = CAN_PLAY;

module.exports = MyMedia;
