'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _xeeUtils = require('xee-utils');

var _xeeUtils2 = _interopRequireDefault(_xeeUtils);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Base = _xeeUtils2["default"].Base,
    Events = _xeeUtils2["default"].Events,
    raf = _xeeUtils2["default"].raf,
    support = _xeeUtils2["default"].support;

var $ = _jquery2["default"];

// 是否支持多媒体
var IS_SUPPORT_MEDIA = typeof support.media != 'undefined' ? support.media : function () {
    var video = document.createElement('video');
    var audio = document.createElement('audio');
    return !!video.play && !!audio.play;
}();

var CAN_PLAY_THROUGH = 1;
var CAN_PLAY = 0;

// 判断是否已加载时长与全部时长之间的差值是否小于这个值
var DELTA = .5;

var MyMedia = function (_Base) {
    _inherits(MyMedia, _Base);

    function MyMedia(opt) {
        _classCallCheck(this, MyMedia);

        var _this2 = _possibleConstructorReturn(this, (MyMedia.__proto__ || Object.getPrototypeOf(MyMedia)).call(this));

        _this2.__options__ = {
            time: _xeeUtils2["default"].isNumber(opt.time) ? opt.time : 0,
            volume: _xeeUtils2["default"].isNumber(opt.volume) ? opt.volume : 1,
            autoplay: _xeeUtils2["default"].isBoolean(opt.autoplay) ? opt.autoplay : false,
            loop: _xeeUtils2["default"].isBoolean(opt.loop) ? opt.loop : false,
            preload: _xeeUtils2["default"].isBoolean(opt.preload) ? opt.preload : false,
            doneTime: opt.doneTime || CAN_PLAY
        };

        _this2.__isLoading__ = false;
        return _this2;
    }

    /*
        初始化相关配置，由子类在声明好$media后调用
        @private
    */


    _createClass(MyMedia, [{
        key: '__init__',
        value: function __init__() {
            this.__bind__();

            this.time(this.__options__.time);
            this.volume(this.__options__.volume);
            this.__options__.loop ? this.$media.attr('loop', true) : this.$media.removeAttr('loop');
            if (this.__options__.preload) {
                this.__loadMedia__();
            } else {
                this.$media.attr('preload', 'none');
            }
            this.__options__.autoplay && this.play();
        }
    }, {
        key: '__bind__',
        value: function __bind__() {
            var _this3 = this;

            var media = this.$media[0];
            var isDone = false;
            var isWaitToPlay = false;

            this.__events__ = new Events();

            this.__events__.on('playIfDone', function () {
                if (isDone) {
                    _this3.__delayPlay__();
                } else {
                    _this3.__loadMedia__();
                    isWaitToPlay = true;
                }
            });

            this.__events__.on('pause', function () {
                _this3.__pause__();
                isWaitToPlay = false;
            });

            this.__events__.on('done', function () {
                _this3.$media.removeClass('media--loading');
                isDone = true;
                if (isWaitToPlay) {
                    _this3.__delayPlay__();
                }
            });

            this.__events__.on('loading', function () {
                _this3.$media.addClass('media--loading');
            });

            this.__events__.on('done', function () {
                _this3.$media.on('ended', function (e) {
                    _this3.__events__.emit('ended', e);
                }).on('timeupdate', function (e) {
                    _this3.__events__.emit('timeupdate', e);
                });
            });
        }
    }, {
        key: '__loadMedia__',
        value: function __loadMedia__() {
            if (this.__isLoading__) return false;
            this.__isLoading__ = true;

            var _this = this;
            var media = this.$media[0];
            var doneTime = _this.__options__.doneTime;
            var loadRAFId = -1;

            if (doneTime == CAN_PLAY && (media.readyState === media.HAVE_FUTURE_DATA || media.readyState == media.HAVE_ENOUGH_DATA) || doneTime == CAN_PLAY_THROUGH && media.readyState == media.HAVE_ENOUGH_DATA) {
                _this.__done__();
            } else {
                var _onLoad2 = function _onLoad2() {
                    var current = 0;
                    var duration = media.duration;

                    if (media.buffered && media.buffered.length) {
                        current = media.buffered.end(0);
                    }

                    if (doneTime == CAN_PLAY_THROUGH && current > 0 && current >= duration - DELTA || doneTime == CAN_PLAY && current > 0) {
                        _this.__pause__();
                        _this.time(initTime);
                        _this.volume(initVolume);
                        _this.__done__();
                        return true;
                    }

                    _this.__events__.emit('loading', current, duration);

                    loadRAFId = raf(_onLoad2);
                };

                media.preload = 'auto';

                var initVolume = _this.volume();
                var initTime = _this.time();

                // 当需要加载全部资源时，如果视频非播放状态，只会加载前面部分文件资源。需要视频处于播放状态，才会加载全部文件资源
                _this.volume(0);
                _this.__delayPlay__();
                _onLoad2();
            }
        }

        // Uncaught (in promise) DOMException: The play() request was interrupted by a call to pause().

    }, {
        key: '__delayPlay__',
        value: function __delayPlay__() {
            var media = this.$media[0];

            media.paused && media.play();
            this.__events__.emit('play');
        }
    }, {
        key: '__pause__',
        value: function __pause__() {
            var media = this.$media[0];

            !media.paused && media.pause();
        }
    }, {
        key: '__done__',
        value: function __done__() {
            var _this4 = this;

            setTimeout(function () {
                _this4.__events__.emit('done');
            });
        }
    }, {
        key: 'getElement',
        value: function getElement() {
            return this.$media[0];
        }
    }, {
        key: 'play',
        value: function play() {
            if (!IS_SUPPORT_MEDIA) return this;

            this.__events__.emit('playIfDone');

            return this;
        }
    }, {
        key: 'pause',
        value: function pause() {
            if (!IS_SUPPORT_MEDIA) return this;

            this.__events__.emit('pause');

            return this;
        }
    }, {
        key: 'reset',
        value: function reset() {
            if (!IS_SUPPORT_MEDIA) return this;

            this.time(0);
            this.pause();

            return this;
        }
    }, {
        key: 'replay',
        value: function replay() {
            if (!IS_SUPPORT_MEDIA) return this;

            this.time(0);
            this.play();

            return this;
        }
    }, {
        key: 'time',
        value: function time(val) {
            if (!IS_SUPPORT_MEDIA) return false;

            if (_xeeUtils2["default"].isNumber(val)) {
                try {
                    this.$media[0].currentTime = val;
                } catch (e) {
                    return false;
                }

                return true;
            }

            return this.$media[0].currentTime;
        }
    }, {
        key: 'volume',
        value: function volume(val) {
            if (!IS_SUPPORT_MEDIA) return false;

            if (_xeeUtils2["default"].isNumber(val)) {
                this.$media[0].volume = val;

                return true;
            }

            return this.$media[0].volume;
        }
    }, {
        key: 'onPlay',
        value: function onPlay(cb) {
            var _this5 = this;

            if (!IS_SUPPORT_MEDIA) {
                return false;
            }

            this.__events__.on('play', cb);

            return function () {
                _this5.__events__.off('play', cb);
            };
        }
    }, {
        key: 'onPause',
        value: function onPause(cb) {
            var _this6 = this;

            if (!IS_SUPPORT_MEDIA) {
                return false;
            }

            this.__events__.on('pause', cb);

            return function () {
                _this6.__events__.off('pause', cb);
            };
        }
    }, {
        key: 'onDone',
        value: function onDone(cb) {
            var _this7 = this;

            if (!IS_SUPPORT_MEDIA) {
                return false;
            }

            this.__events__.on('done', cb);

            return function () {
                _this7.__events__.off('done', cb);
            };
        }
    }, {
        key: 'onLoading',
        value: function onLoading(cb) {
            var _this8 = this;

            if (!IS_SUPPORT_MEDIA) {
                return false;
            }

            this.__events__.on('loading', cb);

            return function () {
                _this8.__events__.off('loading', cb);
            };
        }
    }, {
        key: 'onEnd',
        value: function onEnd(cb) {
            var _this9 = this;

            if (!IS_SUPPORT_MEDIA) {
                return false;
            }

            this.__events__.on('ended', cb);

            return function () {
                _this9.__events__.off('ended', cb);
            };
        }
    }, {
        key: 'onTimeUpdate',
        value: function onTimeUpdate(cb) {
            var _this10 = this;

            if (!IS_SUPPORT_MEDIA) {
                return false;
            }

            this.__events__.on('timeupdate', cb);

            return function () {
                _this10.__events__.off('timeupdate', cb);
            };
        }
    }]);

    return MyMedia;
}(Base);

MyMedia.IS_SUPPORT_MEDIA = IS_SUPPORT_MEDIA;
MyMedia.CAN_PLAY_THROUGH = CAN_PLAY_THROUGH;
MyMedia.CAN_PLAY = CAN_PLAY;

module.exports = MyMedia;