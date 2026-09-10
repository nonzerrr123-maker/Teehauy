begin;

create or replace function public.save_dream_prediction(
  p_interpretation_id uuid,
  p_draw_id uuid,
  p_numbers jsonb,
  p_is_public boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_prediction_id uuid;
  existing_prediction_public boolean;
  dream_id_value uuid;
  dream_body text;
  number_item jsonb;
  normalized_value text;
  normalized_kind text;
  item_rank smallint := 1;
  public_post_body text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select interpretation.dream_id, dream.dream_text
    into dream_id_value, dream_body
  from public.dream_interpretations interpretation
  join public.dreams dream on dream.id = interpretation.dream_id
  where interpretation.id = p_interpretation_id
    and interpretation.user_id = current_user_id
    and dream.user_id = current_user_id;

  if dream_id_value is null then
    raise exception 'Dream interpretation not found';
  end if;

  if not exists (
    select 1 from public.lottery_draws
    where id = p_draw_id and status = 'scheduled'
  ) then
    raise exception 'Scheduled draw not found';
  end if;

  if jsonb_typeof(p_numbers) <> 'array'
    or jsonb_array_length(p_numbers) not between 1 and 20 then
    raise exception 'Predictions require 1-20 numbers';
  end if;

  select prediction.id, prediction.is_public
    into new_prediction_id, existing_prediction_public
  from public.user_predictions prediction
  where prediction.user_id = current_user_id
    and prediction.draw_id = p_draw_id
    and prediction.dream_interpretation_id = p_interpretation_id
    and prediction.status = 'submitted'
  limit 1;

  if new_prediction_id is not null and p_is_public and not existing_prediction_public then
    raise exception 'A private saved prediction cannot be published after submission';
  end if;

  if new_prediction_id is null then
    insert into public.user_predictions (
      user_id,
      draw_id,
      source_type,
      dream_interpretation_id,
      title,
      is_public
    )
    values (
      current_user_id,
      p_draw_id,
      'dream',
      p_interpretation_id,
      'เลขจากความฝัน',
      p_is_public
    )
    returning id into new_prediction_id;

    for number_item in select value from jsonb_array_elements(p_numbers)
    loop
      normalized_value := regexp_replace(
        coalesce(number_item ->> 'value', ''),
        '[^0-9]',
        '',
        'g'
      );
      normalized_kind := case number_item ->> 'type'
        when '2top' then 'derived_top_two'
        when '2bot' then 'last_two'
        when '3top' then 'dream_three'
        else null
      end;

      if normalized_kind is not null then
        insert into public.prediction_numbers (
          prediction_id,
          user_id,
          number_kind,
          number_value,
          rank
        )
        values (
          new_prediction_id,
          current_user_id,
          normalized_kind,
          normalized_value,
          item_rank
        )
        on conflict (prediction_id, number_kind, number_value) do nothing;
        item_rank := item_rank + 1;
      end if;
    end loop;

    update public.user_predictions
    set status = 'submitted'
    where id = new_prediction_id;
  end if;

  if p_is_public then
    update public.dreams
    set visibility = 'public'
    where id = dream_id_value;

    public_post_body := 'ฝันว่า “' || dream_body || '”' || E'\n\nเลขจากความฝัน: ' ||
      array_to_string(
        array(
          select regexp_replace(coalesce(value ->> 'value', ''), '[^0-9]', '', 'g')
          from jsonb_array_elements(p_numbers)
          where regexp_replace(coalesce(value ->> 'value', ''), '[^0-9]', '', 'g') <> ''
        ),
        ' · '
      );

    if not exists (
      select 1 from public.posts
      where author_id = current_user_id
        and related_prediction_id = new_prediction_id
        and status = 'published'
    ) then
      insert into public.posts (author_id, related_prediction_id, body, status)
      values (current_user_id, new_prediction_id, left(public_post_body, 2000), 'published');
    end if;
  end if;

  return new_prediction_id;
end;
$$;

revoke all on function public.save_dream_prediction(uuid, uuid, jsonb, boolean)
  from public, anon;
grant execute on function public.save_dream_prediction(uuid, uuid, jsonb, boolean)
  to authenticated;

commit;
