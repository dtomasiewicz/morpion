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
    @x_min = @x_max = @y_min = @y_max = 0
  end

  def mark(x, y, line = nil)
    @data[[x, y]] = {} # nil until played

    @x_min = x if x < @x_min
    @x_max = x if x > @x_max
    @y_min = y if y < @y_min
    @y_max = y if y > @y_max

    # extends the boundary to all open points around the mark
    @bound.delete [x, y]
    [x-1,x,x+1].product([y-1,y,y+1]).each do |(bx, by)|
      @bound << [bx, by] unless @data[[bx, by]]
    end

    write_line *line if line

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
      ahead, behind = [1, -1].map do |dir|
        adj = 0
        continuous = true
        (1..@l+@d).each do |i|
          if p = @data[[x+i*dx*dir, y+i*dy*dir]]
            if p[d]
              adj = [i-@d, adj].min
              break
            elsif continuous
              adj += 1
            end
          else
            continuous = false
          end
        end
        adj
      end

      (-behind..ahead-@l).each do |i|
        lines << [x+i*dx, y+i*dy, dx, dy]
      end
    end

    lines
  end

  def to_s(bound = false)
    b = bound ? 1 : 0
    (@y_min-b..@y_max+b).map do |y|
      (@x_min-b..@x_max+b).map do |x|
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

  # todo: something more efficient?
  def deep_copy
    Marshal.load Marshal.dump(self)
  end

  private

  def write_line(x, y, dx, dy)
    (0..@l).each do |i|
      xi, yi = x+i*dx, y+i*dy
      @data[[xi, yi]][[dx, dy]] ||= Set.new
      @data[[xi, yi]][[dx, dy]] << [x, y]
    end
  end

end
