/*!
 * FlowerJS
 * Visit https://github.com/jirotubuyaki
 *
 * Copyright (c) 2023 Masashi OKADA.
 *
 * I modified p._updateTargetProps method and added p.flower_sprite and p.flowerrnd_sprite.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
function Flower() {
  (this.flower = new createjs.Container()),
    (this.flower.label = "normal"),
    (this.flower.out = new Array()),
    (this.flower.graphics_out = new Array()),
    (this.flower.rate_count = new Array()),
    (this.flower.size = 20),
    (this.flower.color = "#ff1493"),
    (this.flower.alpha = 0.7),
    (this.flower.petal = 6),
    (this.flower.petal_size = 50),
    (this.flower.pile = 1),
    (this.flower.pile_scale = 1);
}
function FlowerRnd() {
  (this.flower = new createjs.Container()),
    (this.flower.label = "rnd"),
    (this.flower.out = new Array()),
    (this.flower.graphics_out = new Array()),
    (this.flower.rate_count = new Array()),
    (this.flower.noise_1 = new Array()),
    (this.flower.noise_2 = new Array()),
    (this.flower.size = 20),
    (this.flower.color = "#ff1493"),
    (this.flower.alpha = 0.7),
    (this.flower.petal = 6),
    (this.flower.petal_size = 50),
    (this.flower.pile = 1),
    (this.flower.pile_scale = 1);
}
function SunFlower() {
  (this.flower = new createjs.Container()),
    (this.flower.label = "sun"),
    (this.flower.out = new Array()),
    (this.flower.out_line = new Array()),
    (this.flower.graphics_out = new Array()),
    (this.flower.graphics_out_line = new Array()),
    (this.flower.rate_count = new Array()),
    (this.flower.noise_1 = new Array()),
    (this.flower.noise_2 = new Array()),
    (this.flower.size = 20),
    (this.flower.color_line = "#ddd"),
    (this.flower.color = "#ff1493"),
    (this.flower.alpha = 0.7),
    (this.flower.petal = 6),
    (this.flower.petal_size = 50),
    (this.flower.pile = 1),
    (this.flower.pile_scale = 1);
}
(Flower.prototype = {
  init: function () {
    for (i = 0; i < this.flower.petal; i++)
      eval("this.flower.petal_scale_" + i + " = 1;");
    return this;
  },
  get: function () {
    return this;
  },
  setSize: function (t) {
    return (this.flower.size = t), this;
  },
  setColor: function (t) {
    return (this.flower.color = t), this;
  },
  setAlpha: function (t) {
    return (this.flower.alpha = t), this;
  },
  setPetal: function (num) {
    for (this.flower.petal = num, i = 0; i < this.flower.petal; i++)
      eval("this.flower.petal_scale_" + i + " = 1;");
    return this;
  },
  setPetalSize: function (t) {
    return (this.flower.petal_size = t), this;
  },
  setPetalThickness: function (t) {
    return (this.flower.petal_thickness = t), this;
  },
  setPile: function (t, e) {
    return (this.flower.pile = t), (this.flower.pile_scale = e), this;
  },
  setRotation: function (t) {
    return (this.flower.rotation = t), this;
  },
  create: function (t, e) {
    for (var i = 0; i < this.flower.pile; i++) {
      for (var o = 0; o < this.flower.petal; o++) this.flower.rate_count[o] = 1;
      var r = 0;
      (this.flower.graphics_out[i] = new createjs.Graphics()),
        this.flower.graphics_out[i]
          .beginStroke(this.flower.color)
          .beginFill(this.flower.color);
      var s = 360 / this.flower.petal;
      for (o = 0; o < 360; o += s)
        0 == r &&
          this.flower.graphics_out[i].moveTo(
            this.flower.size * Math.cos((0 * Math.PI) / 180),
            this.flower.size * Math.sin((0 * Math.PI) / 180)
          ),
          o + s > 360
            ? this.flower.graphics_out[i].quadraticCurveTo(
                (this.flower.size + this.flower.petal_size) *
                  Math.cos(((o + s - s / 2) * Math.PI) / 180),
                (this.flower.size + this.flower.petal_size) *
                  Math.sin(((o + s - s / 2) * Math.PI) / 180),
                this.flower.size * Math.cos((0 * Math.PI) / 180),
                this.flower.size * Math.sin((0 * Math.PI) / 180)
              )
            : this.flower.graphics_out[i].quadraticCurveTo(
                (this.flower.size + this.flower.petal_size) *
                  Math.cos(((o + s - s / 2) * Math.PI) / 180),
                (this.flower.size + this.flower.petal_size) *
                  Math.sin(((o + s - s / 2) * Math.PI) / 180),
                this.flower.size * Math.cos(((o + s) * Math.PI) / 180),
                this.flower.size * Math.sin(((o + s) * Math.PI) / 180)
              ),
          r++;
      (this.flower.out[i] = new createjs.Shape(this.flower.graphics_out[i])),
        (this.flower.out[i].x = t),
        (this.flower.out[i].y = e),
        (this.flower.x = t),
        (this.flower.y = e),
        (this.flower.regX = t),
        (this.flower.regY = e),
        (this.flower.out[i].rotation = this.flower.rotation),
        (this.flower.out[i].regX = this.flower.out[i].width / 2),
        (this.flower.out[i].regY = this.flower.out[i].height / 2),
        (this.flower.out[i].alpha = this.flower.alpha),
        this.flower.addChild(this.flower.out[i]);
    }
    return this;
  },
}),
  (FlowerRnd.prototype = {
    init: function () {
      for (i = 0; i < this.flower.petal; i++)
        eval("this.flower.petal_scale_" + i + " = 1;"),
          this.flower.noise_1.push(15 - 30 * Math.random()),
          this.flower.noise_2.push(10 - 20 * Math.random());
      return this;
    },
    get: function () {
      return this;
    },
    setSize: function (t) {
      return (this.flower.size = t), this;
    },
    setColor: function (t) {
      return (this.flower.color = t), this;
    },
    setAlpha: function (t) {
      return (this.flower.alpha = t), this;
    },
    setPetal: function (num) {
      for (this.flower.petal = num, i = 0; i < this.flower.petal; i++)
        eval("this.flower.petal_scale_" + i + " = 1;");
      return this;
    },
    setNoise: function (t) {
      for (i = 0; i < this.flower.petal; i++)
        this.flower.noise_1.push((30 * t) / 2 - 30 * Math.random() * t),
          this.flower.noise_2.push((20 * t) / 2 - 20 * Math.random() * t);
      return this;
    },
    setPetalSize: function (t) {
      return (this.flower.petal_size = t), this;
    },
    setPetalThickness: function (t) {
      return (this.flower.petal_thickness = t), this;
    },
    setPile: function (t, e) {
      return (this.flower.pile = t), (this.flower.pile_scale = e), this;
    },
    setRotation: function (t) {
      return (this.flower.rotation = t), this;
    },
    create: function (t, e) {
      for (var i = 0; i < this.flower.pile; i++) {
        for (var o = 0; o < this.flower.petal; o++)
          this.flower.rate_count[o] = 1;
        var r = 0;
        (this.flower.graphics_out[i] = new createjs.Graphics()),
          this.flower.graphics_out[i]
            .beginStroke(this.flower.color)
            .beginFill(this.flower.color);
        var s = 360 / this.flower.petal;
        for (o = 0; o < 360; o += s)
          0 == r &&
            this.flower.graphics_out[i].moveTo(
              this.flower.size * Math.cos((0 * Math.PI) / 180),
              this.flower.size * Math.sin((0 * Math.PI) / 180)
            ),
            o + s > 360
              ? this.flower.graphics_out[i].quadraticCurveTo(
                  (this.flower.noise_2[r] +
                    this.flower.size +
                    this.flower.petal_size) *
                    Math.cos(
                      ((this.flower.noise_1[r] + o + s - s / 2) * Math.PI) / 180
                    ),
                  (this.flower.noise_2[r] +
                    this.flower.size +
                    this.flower.petal_size) *
                    Math.sin(
                      ((this.flower.noise_1[r] + o + s - s / 2) * Math.PI) / 180
                    ),
                  this.flower.size * Math.cos((0 * Math.PI) / 180),
                  this.flower.size * Math.sin((0 * Math.PI) / 180)
                )
              : this.flower.graphics_out[i].quadraticCurveTo(
                  (this.flower.noise_2[r] +
                    this.flower.size +
                    this.flower.petal_size) *
                    Math.cos(
                      ((this.flower.noise_1[r] + o + s - s / 2) * Math.PI) / 180
                    ),
                  (this.flower.noise_2[r] +
                    this.flower.size +
                    this.flower.petal_size) *
                    Math.sin(
                      ((this.flower.noise_1[r] + o + s - s / 2) * Math.PI) / 180
                    ),
                  this.flower.size * Math.cos(((o + s) * Math.PI) / 180),
                  this.flower.size * Math.sin(((o + s) * Math.PI) / 180)
                ),
            r++;
        (this.flower.out[i] = new createjs.Shape(this.flower.graphics_out[i])),
          (this.flower.out[i].x = t),
          (this.flower.out[i].y = e),
          (this.flower.x = t),
          (this.flower.y = e),
          (this.flower.regX = t),
          (this.flower.regY = e),
          (this.flower.out[i].rotation = 360 * Math.random()),
          (this.flower.out[i].regX = this.flower.out[i].width / 2),
          (this.flower.out[i].regY = this.flower.out[i].height / 2),
          (this.flower.out[i].alpha = this.flower.alpha),
          this.flower.addChild(this.flower.out[i]);
      }
      return this;
    },
  }),
  (SunFlower.prototype = {
    init: function () {
      for (i = 0; i < this.flower.petal; i++)
        eval("this.flower.petal_scale_" + i + " = 1;"),
          this.flower.noise_1.push(15 - 30 * Math.random()),
          this.flower.noise_2.push(10 - 20 * Math.random());
      return this;
    },
    get: function () {
      return this;
    },
    setSize: function (t) {
      return (this.flower.size = t), this;
    },
    setColor: function (t) {
      return (this.flower.color = t), this;
    },
    setColorLine: function (t) {
      return (this.flower.color_line = t), this;
    },
    setAlpha: function (t) {
      return (this.flower.alpha = t), this;
    },
    setPetal: function (num) {
      for (this.flower.petal = num, i = 0; i < this.flower.petal; i++)
        eval("this.flower.petal_scale_" + i + " = 1;");
      return this;
    },
    setPetalSize: function (t) {
      return (this.flower.petal_size = t), this;
    },
    setPetalThickness: function (t) {
      return (this.flower.petal_thickness = t), this;
    },
    setPile: function (t, e) {
      return (this.flower.pile = t), (this.flower.pile_scale = e), this;
    },
    setRotation: function (t) {
      return (this.flower.rotation = t), this;
    },
    create: function (t, e) {
      for (var i = 0; i < this.flower.pile; i++) {
        for (var o = 0; o < this.flower.petal; o++)
          this.flower.rate_count[o] = 1;
        var r = 0;
        (this.flower.graphics_out[i] = new createjs.Graphics()),
          this.flower.graphics_out[i]
            .beginStroke(this.flower.color)
            .beginFill(this.flower.color);
        var s = 360 / this.flower.petal;
        for (o = 0; o <= 360; o += s)
          0 == r &&
            this.flower.graphics_out[i].moveTo(
              this.flower.size * Math.cos((0 * Math.PI) / 180),
              this.flower.size * Math.sin((0 * Math.PI) / 180)
            ),
            o + s > 360
              ? this.flower.graphics_out[i].quadraticCurveTo(
                  (this.flower.size + this.flower.petal_size) *
                    Math.cos(((o + s - s / 2) * Math.PI) / 180),
                  (this.flower.size + this.flower.petal_size) *
                    Math.sin(((o + s - s / 2) * Math.PI) / 180),
                  this.flower.size * Math.cos((0 * Math.PI) / 180),
                  this.flower.size * Math.sin((0 * Math.PI) / 180)
                )
              : this.flower.graphics_out[i].quadraticCurveTo(
                  (this.flower.size + this.flower.petal_size) *
                    Math.cos(((o + s - s / 2) * Math.PI) / 180),
                  (this.flower.size + this.flower.petal_size) *
                    Math.sin(((o + s - s / 2) * Math.PI) / 180),
                  this.flower.size * Math.cos(((o + s) * Math.PI) / 180),
                  this.flower.size * Math.sin(((o + s) * Math.PI) / 180)
                ),
            r++;
        (this.flower.out[i] = new createjs.Shape(this.flower.graphics_out[i])),
          (this.flower.out[i].x = t),
          (this.flower.out[i].y = e),
          (this.flower.x = t),
          (this.flower.y = e),
          (this.flower.regX = t),
          (this.flower.regY = e),
          (this.flower.out[i].rotation = 360 * Math.random()),
          (this.flower.out[i].regX = this.flower.out[i].width / 2),
          (this.flower.out[i].regY = this.flower.out[i].height / 2),
          (this.flower.out[i].alpha = this.flower.alpha),
          this.flower.addChild(this.flower.out[i]),
          (r = 0);
        for (o = 0; o <= 360; o += 13)
          (this.flower.graphics_out_line[r] = new createjs.Graphics()),
            this.flower.graphics_out_line[r]
              .beginStroke(this.flower.color_line)
              .setStrokeStyle(1),
            this.flower.graphics_out_line[r].moveTo(
              this.flower.size * Math.cos((o * Math.PI) / 180),
              this.flower.size * Math.sin(o * (Math.PI / 180))
            ),
            this.flower.graphics_out_line[r].lineTo(
              this.flower.size * Math.cos(((180 - o) * Math.PI) / 180),
              this.flower.size * Math.sin((180 - o) * (Math.PI / 180))
            ),
            this.flower.graphics_out_line[r].endStroke(),
            (this.flower.out_line[r] = new createjs.Shape(
              this.flower.graphics_out_line[r]
            )),
            (this.flower.out_line[r].x = t),
            (this.flower.out_line[r].y = e),
            this.flower.addChild(this.flower.out_line[r]),
            r++;
        for (o = 0; o <= 360; o += 13)
          (this.flower.graphics_out_line[r] =
            new createjs.Graphics().setStrokeStyle(1)),
            this.flower.graphics_out_line[r].beginStroke(
              this.flower.color_line
            ),
            this.flower.graphics_out_line[r].moveTo(
              this.flower.size * Math.cos(((o - 45) * Math.PI) / 180),
              this.flower.size * Math.sin((o - 45) * (Math.PI / 180))
            ),
            this.flower.graphics_out_line[r].lineTo(
              this.flower.size * Math.cos(((225 - o) * Math.PI) / 180),
              this.flower.size * Math.sin((225 - o) * (Math.PI / 180))
            ),
            this.flower.graphics_out_line[r].endStroke(),
            (this.flower.out_line[r] = new createjs.Shape(
              this.flower.graphics_out_line[r]
            )),
            (this.flower.out_line[r].x = t),
            (this.flower.out_line[r].y = e),
            (this.flower.out_line[r].rotation = 90),
            this.flower.addChild(this.flower.out_line[r]),
            r++;
      }
      return this;
    },
  });
