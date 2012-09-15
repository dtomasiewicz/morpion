var Morpion = function(len, dis = 0) {
  this.len = len;
  this.dis = dis;
  this.data = {};
  this.bound = {};
  this.x_min = this.x_max = this.y_min = this.y_max = 0;
};

Morpion.prototype = {

  HOR: [1, 0],
  VER: [0, 1],
  ASC: [1, -1],
  DES: [1, 1],

  mark: function(x, y, line) {
    this.data[[x, y]] = {};

    if(x < this.x_min) this.x_min = x;
    if(x > this.x_max) this.x_max = x;
    if(y < this.y_min) this.y_min = y;
    if(y > this.y_max) this.y_max = y;

    delete this.bound[[x,y]];
    for(var bx = x-1; bx <= x+1; bx++) {
      for(var by = y-1; by <= y+1; by++) {
        if(!this.data[[bx, by]]) {
          this.bound[[bx, by]] = true;
        }
      }
    }

    if(line) {
      var lx = line[0], ly = line[1], dx = line[2], dy = line[3];
      for(var i = 0; i <= this.len; i++) {
        this.data[[lx+i*dx, ly+i*dy]][[dx, dy]] = [lx, ly];
      }
    }

    return this;
  },

  vec: function(key) {
    return key.split(',').map(parseInt);
  }

};