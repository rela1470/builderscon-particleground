/*!
 * Particleground
 *
 * @author Jonathan Nicol - @mrjnicol
 * @version 1.1.0
 * @description Creates a canvas based particle system background
 *
 * Inspired by http://requestlab.fr/ and http://disruptivebydesign.com/
 */

;(function(window, document) {
  "use strict";
  var pluginName = 'particleground';
  var particleRegistry = {};
  var orientationSupport = !!window.DeviceOrientationEvent;
  var desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i);

  // http://youmightnotneedjquery.com/#deep_extend
  function extend(out) {
    out = out || {};
    for (var i = 1; i < arguments.length; i++) {
      var obj = arguments[i];
      if (!obj) continue;
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object')
            deepExtend(out[key], obj[key]);
          else
            out[key] = obj[key];
        }
      }
    }
    return out;
  };

  var $ = window.jQuery;

  function Particle(group) {
    this.group = group
    this.active = true;
    this.layer = Math.ceil(Math.random() * 3);
    this.parallaxOffsetX = 0;
    this.parallaxOffsetY = 0;
    this.position = {
      x: Math.ceil(Math.random() * group.canvas.width),
      y: Math.ceil(Math.random() * group.canvas.height)
    }
    this.speed = {}
    switch (this.group.directionX) {
      case 'left':
        this.speed.x = +(-this.group.maxSpeedX + (Math.random() * this.group.maxSpeedX) - this.group.minSpeedX).toFixed(2);
        break;
      case 'right':
        this.speed.x = +((Math.random() * this.group.maxSpeedX) + this.group.minSpeedX).toFixed(2);
        break;
      default:
        this.speed.x = +((-this.group.maxSpeedX / 2) + (Math.random() * this.group.maxSpeedX)).toFixed(2);
        this.speed.x += this.speed.x > 0 ? this.group.minSpeedX : -this.group.minSpeedX;
        break;
    }
    switch (this.group.directionY) {
      case 'up':
        this.speed.y = +(-this.group.maxSpeedY + (Math.random() * this.group.maxSpeedY) - this.group.minSpeedY).toFixed(2);
        break;
      case 'down':
        this.speed.y = +((Math.random() * this.group.maxSpeedY) + this.group.minSpeedY).toFixed(2);
        break;
      default:
        this.speed.y = +((-this.group.maxSpeedY / 2) + (Math.random() * this.group.maxSpeedY)).toFixed(2);
        this.speed.x += this.speed.y > 0 ? this.group.minSpeedY : -this.group.minSpeedY;
        break;
    }
  }

  Particle.prototype.setStackPos = function(i) {
    this.stackPos = i;
  }

  Particle.prototype.updatePosition = function() {
    var winW = window.innerWidth;
    var winH = window.innerHeight;
    var pointerX = 0;
    var pointerY = 0;
    if (this.group.parallax) {
      if (orientationSupport && !desktop) {
        // Map tiltX range [-30,30] to range [0,winW]
        var ratioX = (winW - 0) / (30 - -30);
        pointerX = (this.group.tiltX - -30) * ratioX + 0;
        // Map tiltY range [-30,30] to range [0,winH]
        var ratioY = (winH - 0) / (30 - -30);
        pointerY = (this.group.tiltY - -30) * ratioY + 0;
      } else {
        pointerX = this.group.mouseX;
        pointerY = this.group.mouseY;
      }
      // Calculate parallax offsets
      this.parallaxTargX = (pointerX - (winW / 2)) / (this.group.parallaxMultiplier * this.layer);
      this.parallaxOffsetX += (this.parallaxTargX - this.parallaxOffsetX) / 10; // Easing equation
      this.parallaxTargY = (pointerY - (winH / 2)) / (this.group.parallaxMultiplier * this.layer);
      this.parallaxOffsetY += (this.parallaxTargY - this.parallaxOffsetY) / 10; // Easing equation
    }

    var elWidth = 2020;//this.group.element.offsetWidth;
    var elHeight = 1180;//this.group.element.offsetHeight;

    switch (this.group.directionX) {
      case 'left':
        if (this.position.x + this.speed.x + this.parallaxOffsetX < 0) {
          this.position.x = elWidth - this.parallaxOffsetX;
        }
        break;
      case 'right':
        if (this.position.x + this.speed.x + this.parallaxOffsetX > elWidth) {
          this.position.x = 0 - this.parallaxOffsetX;
        }
        break;
      default:
        // If particle has reached edge of canvas, reverse its direction
        if (this.position.x + this.speed.x + this.parallaxOffsetX > elWidth || this.position.x + this.speed.x + this.parallaxOffsetX < 0) {
          this.speed.x = -this.speed.x;
        }
        break;
    }

    switch (this.group.directionY) {
      case 'up':
        if (this.position.y + this.speed.y + this.parallaxOffsetY < 0) {
          this.position.y = elHeight - this.parallaxOffsetY;
        }
        break;
      case 'down':
        if (this.position.y + this.speed.y + this.parallaxOffsetY > elHeight) {
          this.position.y = 0 - this.parallaxOffsetY;
        }
        break;
      default:
        // If particle has reached edge of canvas, reverse its direction
        if (this.position.y + this.speed.y + this.parallaxOffsetY > elHeight || this.position.y + this.speed.y + this.parallaxOffsetY < 0) {
          this.speed.y = -this.speed.y;
        }
        break;
    }

    // Move particle
    this.position.x += this.speed.x;
    this.position.y += this.speed.y;
  }

  Particle.prototype.draw = function() {
    // Draw circle
    this.group.ctx.beginPath();
    this.group.ctx.arc(this.position.x + this.parallaxOffsetX, this.position.y + this.parallaxOffsetY, this.group.particleRadius / 2, 0, Math.PI * 2, true);
    this.group.ctx.closePath();
    this.group.ctx.fill();

    // Draw lines
    this.group.ctx.beginPath();
    // Iterate over all particles which are higher in the stack than this one
    for (var i = this.group.particles.length - 1; i > this.stackPos; i--) {
      var p2 = this.group.particles[i];

      // Pythagorus theorum to get distance between two points
      var a = this.position.x - p2.position.x
      var b = this.position.y - p2.position.y
      var dist = Math.sqrt((a * a) + (b * b)).toFixed(2);

      // If the two particles are in proximity, join them
      if (dist < this.group.proximity) {
        this.group.ctx.moveTo(this.position.x + this.parallaxOffsetX, this.position.y + this.parallaxOffsetY);
        if (this.group.curvedLines) {
          this.group.ctx.quadraticCurveTo(Math.max(p2.position.x, p2.position.x), Math.min(p2.position.y, p2.position.y), p2.position.x + p2.parallaxOffsetX, p2.position.y + p2.parallaxOffsetY);
        } else {
          this.group.ctx.lineTo(p2.position.x + p2.parallaxOffsetX, p2.position.y + p2.parallaxOffsetY);
        }
      }
    }
    this.group.ctx.stroke();
    this.group.ctx.closePath();
  }

  ParticleGround.prototype.__initialize__ = function() {
    this.particles = [];
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pg-canvas';
    this.canvas.style.display = 'block';
    this.element.insertBefore(this.canvas, this.element.firstChild);
    this.ctx = this.canvas.getContext('2d');
    this.hooks = {};
    this.__apply_canvas_style__();

    // Create particles
    var numParticles = Math.round((this.canvas.width * this.canvas.height) / this.density);
    for (var i = 0; i < numParticles; i++) {
      var p = new Particle(this);
      p.setStackPos(i);
      this.particles.push(p);
    };

    window.addEventListener('resize', this.resize, false);

    document.addEventListener('mousemove', function(e) {
      this.mouseX = e.pageX;
      this.mouseY = e.pageY;
    }, false);

    if (orientationSupport && !desktop) {
      window.addEventListener('deviceorientation', function () {
        // Contrain tilt range to [-30,30]
        this.tiltY = Math.min(Math.max(-event.beta, -30), 30);
        this.tiltX = Math.min(Math.max(-event.gamma, -30), 30);
      }, true);
    }

    this.__run_hook__('onInit');
    this.start()
  }

  ParticleGround.prototype.__run_hook__ = function(name) {
    if (this.hooks[name] !== undefined) {
      this.hooks[name].call(this);
    }
  }

  ParticleGround.prototype.__apply_canvas_style__ = function() {
    this.canvas.width = 2020;this.element.offsetWidth;
    this.canvas.height = 1180;//this.element.offsetHeight;
    this.ctx.fillStyle = this.dotColor;
    this.ctx.strokeStyle = this.lineColor;
    this.ctx.lineWidth = this.lineWidth;
  }

  ParticleGround.prototype.draw = function() {
    var winW = window.innerWidth;
    var winH = window.innerHeight;

    // Wipe canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update particle positions
    for (var i = 0; i < this.particles.length; i++) {
      this.particles[i].updatePosition();
    };
    // Draw particles
    for (var i = 0; i < this.particles.length; i++) {
      this.particles[i].draw();
    };

    // Call this function next time screen is redrawn
    if (this.paused) {
      this.__cancel_animation__();
    } else {
      this.__animate__();
    }
  }

  ParticleGround.prototype.start = function() {
    this.paused = false;
    this.__animate__();
  }

  ParticleGround.prototype.destroy = function() {
    delete particleRegistry[this.element];
    this.pause();
    if ($) {
       $(this.element).removeData('plugin_' + pluginName);
    }
  }

    

  ParticleGround.prototype.__animate__ = function() {
    this.call_count++;
    var pg = this
    pg.raf = requestAnimationFrame(function(){ pg.draw() });
  }

  ParticleGround.prototype.__cancel_animation__ = function() {
    cancelAnimationFrame(this.raf);
  }

  ParticleGround.prototype.resize = function() {
      this.__apply_canvas_style__();

      var elWidth = 2020;//this.element.offsetWidth;
      var elHeight = 1180;//this.element.offsetHeight;

      // Remove particles that are outside the canvas
      for (var i = this.particles.length - 1; i >= 0; i--) {
        if (this.particles[i].position.x > elWidth || this.particles[i].position.y > elHeight) {
          this.particles.splice(i, 1);
        }
      };

      // Adjust particle density
      var numParticles = Math.round((this.canvas.width * this.canvas.height) / this.density);
      if (numParticles > this.particles.length) {
        while (numParticles > this.particles.length) {
          var p = new Particle();
          this.particles.push(p);
        }
      } else if (numParticles < this.particles.length) {
        this.particles.splice(numParticles);
      }

      // Re-index particles
      for (i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].setStackPos(i);
      };
    }

  ParticleGround.prototype.pause = function() {
      this.paused = true
      this.__cancel_animation__()
    }

  function ParticleGround(element, options) {
    extend(this, window[pluginName].defaults, options);
    this.element = element
    this.mouseX = 0;
    this.mouseY = 0;
    this.__initialize__()
  }

  window.getParticleGround = function(element) {
    return particleRegistry[element];
  }

  function Plugin(element, options) {
    var canvasSupport = !!document.createElement('canvas').getContext;
    options = extend({}, window[pluginName].defaults, options);

    if (!canvasSupport) {
      return;
    }

    var pg = new ParticleGround(element, options)
    particleRegistry[element] = pg;
    return pg;
  }

  window[pluginName] = function(elem, options) {
    return new Plugin(elem, options);
  };

  window[pluginName].defaults = {
    minSpeedX: 0.1,
    maxSpeedX: 0.7,
    minSpeedY: 0.1,
    maxSpeedY: 0.7,
    directionX: 'center', // 'center', 'left' or 'right'. 'center' = dots bounce off edges
    directionY: 'center', // 'center', 'up' or 'down'. 'center' = dots bounce off edges
    density: 10000, // How many particles will be generated: one particle every n pixels
    dotColor: '#666666',
    lineColor: '#666666',
    particleRadius: 7, // Dot size
    lineWidth: 1,
    curvedLines: false,
    proximity: 100, // How close two dots need to be before they join
    parallax: true,
    parallaxMultiplier: 5, // The lower the number, the more extreme the parallax effect
  };

  // nothing wrong with hooking into jQuery if it's there...
  if ($) {
    $.fn[pluginName] = function(options) {
      if (typeof arguments[0] === 'string') {
        var methodName = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);
        var returnVal;
        this.each(function() {
          if ($.data(this, 'plugin_' + pluginName) && typeof $.data(this, 'plugin_' + pluginName)[methodName] === 'function') {
            returnVal = $.data(this, 'plugin_' + pluginName)[methodName].apply(this, args);
          }
        });
        if (returnVal !== undefined){
          return returnVal;
        } else {
          return this;
        }
      } else if (typeof options === "object" || !options) {
        return this.each(function() {
          if (!$.data(this, 'plugin_' + pluginName)) {
            $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
          }
        });
      }
    };
  }

})(window, document);

/**
 * requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 * @see: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 * @see: http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 * @license: MIT license
 */
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                 || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
      window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
}());
