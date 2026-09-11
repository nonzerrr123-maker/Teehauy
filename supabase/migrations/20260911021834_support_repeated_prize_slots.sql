begin;

alter table public.lottery_prizes
  drop constraint lottery_prizes_draw_id_prize_type_winning_number_key;

alter table public.lottery_prizes
  add constraint lottery_prizes_draw_type_sequence_key
  unique (draw_id, prize_type, sequence_number);

comment on constraint lottery_prizes_draw_type_sequence_key on public.lottery_prizes is
  'A prize slot is unique within its draw and tier; historical result sheets may repeat the same winning number in separate slots.';

commit;
