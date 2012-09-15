require_relative 'morpion'

def new_5t_game
  Morpion.new(4).mark_all([
                            [3, 0], [4, 0], [5, 0], [6, 0],
                            [3, 1],                 [6, 1],
                            [3, 2],                 [6, 2],
    [0, 3], [1, 3], [2, 3], [3, 3],                 [6, 3], [7, 3], [8, 3], [9, 3],
    [0, 4],                                                                 [9, 4],
    [0, 5],                                                                 [9, 5],
    [0, 6], [1, 6], [2, 6], [3, 6],                 [6, 6], [7, 6], [8, 6], [9, 6],
                            [3, 7],                 [6, 7],
                            [3, 8],                 [6, 8],
                            [3, 9], [4, 9], [5, 9], [6, 9]
  ])
end

# selects a random move
def select_naive(game)
  game.valid_moves.sample
end

# selects the move that leaves the most options available afterwards
def select_promising(game)
  max, moves = 0, []
  game.valid_moves.each do |move|
    g = game.deep_copy
    g.mark *move
    n = g.valid_moves.length
    if n > max
      max, moves = n, [move]
    elsif n == max
      moves << move
    end
  end
  moves.sample
end

# for each move, plays out random games and selects the move that produces
# the highest score on average
def select_performant(game, trials = 10)
  max_avg, max_move = 0, nil
  game.valid_moves.each do |move|
    scores = trials.times.map do
      g, n = game.deep_copy, 0
      g.mark *move
      while m = select_naive(g)
        g.mark *m
        n += 1
      end
      n
    end
    avg = scores.inject(:+).fdiv trials
    if avg > max_avg
      max_avg = avg
      max_move = move
    end
  end
  max_move
end

=begin
record = 0
loop do
  
  g = new_5t_game
  moves = []
  while move = select_performant(g, 2)
    puts "move"
    g.mark *move
    moves << move
  end

  n = moves.length
  if n > record
    record = n
    sig = moves.map do |x, y, (lx, ly, dx, dy)|
      "#{x},#{y}@#{lx},#{ly}[#{dx},#{dy}]"
    end.join ';'
    puts "== #{record} ==\n#{sig}"
  end

end
=end

# each iteration, selects a promising move based on the score of a
# random game and adds it to the list.
best = []
loop do
  game = new_5t_game
  best.each{|m| game.mark *m}
  
  max_score, max_move = 0, nil
  game.valid_moves.each do |move|
    g = game.deep_copy
    g.mark *move
    score = best.length + 1
    while r = select_naive(g)
      g.mark *r
      score += 1
    end
    if score > max_score
      max_score = score
      max_move = move
    end
  end

  if max_move
    best << max_move
    puts "selected"
  else
    break
  end
end

sig = best.map do |x, y, (lx, ly, dx, dy)|
  "#{x},#{y}@#{lx},#{ly}[#{dx},#{dy}]"
end.join ';'
puts "== #{best.length} ==\n#{sig}"