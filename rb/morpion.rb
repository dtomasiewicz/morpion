require 'set'

class Morpion

  H = HORIZONTAL = [1, 0]
  V = VERTICAL = [0, 1]
  D = DESCENDING = [1, 1]
  A = ASCENDING = [1, -1]
  
  def initialize(line_length, disjoint = 0)
    @l, @d = line_length, disjoint
    @data = {}
    @bound = Set.new
  end

  def mark(x, y, line = nil)
    # add mark and remove it from boundary
    @data[[x, y]] = {}
    @bound.delete [x, y]

    # extends the boundary to all open points around the mark
    draw_bound x, y

    draw_line *line if line

    self
  end

  def unmark(x, y, line)
    clear_line *line if line

    # remove mark; don't assume it's now of the boundary!
    # during initial placement, marks aren't always placed on the boundary
    @data.delete [x, y]
    
    # correct boundary status of this and all surrounding points
    [x-1,x,x+1].product([y-1,y,y+1]).each do |(bx, by)|
      correct_bound bx, by
    end

    self
  end

  # same as mark, but raises an error on an invalid move
  def mark_safe(x, y, line)
    if valid_moves.include?([x, y, line])
      mark x, y, line
    else
      raise 'invalid move'
    end
  end

  def mark_all(marks)
    marks.each{|m| mark *m}
    self
  end

  def valid_moves
    @bound.inject([]) do |moves, (bx, by)|
      moves.concat lines(bx, by).map{|line| [bx, by, line]}
    end
  end

  # returns possible lines for a move made at _open_ spot x,y
  def lines(x, y)
    lines = []

    [H, V, D, A].each do |d|
      dx, dy = d

      # count marks ahead of, and behind, the current point
      behind, ahead = [-1, 1].map do |dir|
        adj = 0
        continuous = true
        (1..@l+@d).each do |i|
          if p = @data[[x+i*dx*dir, y+i*dy*dir]]
            adj += 1 if continuous
            if p[d]
              adj = [i-@d, adj].min
              break
            end
          else
            continuous = false
          end
        end
        [@l, adj].min
      end

      (-behind..ahead-@l).each do |i|
        lines << [x+i*dx, y+i*dy, dx, dy]
      end
    end

    lines
  end

  def to_s(bound = false)
    b = bound ? 1 : 0
    (y_min-b..y_max+b).map do |y|
      (x_min-b..x_max+b).map do |x|
        if @data[[x, y]]
          'X'
        elsif bound && @bound.include?([x, y])
          '-'
        else
          ' '
        end
      end.join ''
    end.join "\n"
  end

  def x_min
    @data.keys.map(&:first).min
  end

  def x_max
    @data.keys.map(&:first).max
  end

  def y_min
    @data.keys.map(&:last).min
  end

  def y_max
    @data.keys.map(&:last).max
  end

  def id
    @data.hash
  end

  private

  # adds open points surrounding x,y to the boundary
  def draw_bound(x, y)
    [x-1,x,x+1].product([y-1,y,y+1]).each do |(bx, by)|
      next if bx == x && by == y
      @bound << [bx, by] unless @data[[bx, by]]
    end
  end

  # adds the given point to the boundary if it is open and adjacent to a mark
  # otherwise, removes it from the boundary
  def correct_bound(x, y)
    unless @data[[x, y]]
      [x-1,x,x+1].product([y-1,y,y+1]).each do |(bx, by)|
        if @data[[bx, by]]
          @bound << [x, y]
          return
        end
      end
    end
    @bound.delete [x, y]
  end

  def draw_line(x, y, dx, dy)
    (0..@l).each do |i|
      xi, yi = x+i*dx, y+i*dy
      @data[[xi, yi]][[dx, dy]] ||= Set.new
      @data[[xi, yi]][[dx, dy]] << [x, y]
    end
  end

  def clear_line(x, y, dx, dy)
    (0..@l).each do |i|
      xi, yi = x+i*dx, y+i*dy
      @data[[xi, yi]][[dx, dy]].delete [x, y]
      @data[[xi, yi]].delete [dx, dy] if @data[[xi, yi]][[dx, dy]].empty?
    end
  end

end
