import express from "express";
import Joi from "joi";
import Todo from "../schemas/todo.schema.js";
import todoSchema from "../schemas/todo.schema.js";

const router = express.Router();

const createdTodoSchema = Joi.object({
  value: Joi.string().min(1).max(50).required(),
});

/** 할일 등록 API  */
router.post("/todos", async (req, res, next) => {
  //
  try {
    const validatedBody = await createdTodoSchema.validateAsync(req.body);

    const { value } = validatedBody;

    // findOne = 1개의 데이터만 조회한다.
    // sort('order') = order컬럼 기준으로 오름차순으로 정렬한다. / sort('-order') = order컬럼 기준으로 내림차순으로 정렬한다.
    const todoMaxOrder = await Todo.findOne().sort("-order").exec();

    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    // 인스턴스 생성
    const todo = new Todo({ value, order });

    // 데이터베이스에 저장
    await todo.save();

    //
    return res.status(201).json(todo);
  } catch (error) {
    // Router 다음에 있는 에러처리 미들웨어 호출
    next(error);
  }
});

/** 할 일 목록 조회 API  */
// next 는 리팩토링을 위해서...?
// 미들웨어에게 전달해주기 위함
router.get("/todos", async (req, res, next) => {
  // Todo모델을 이용해, MongoDB에서 'order' 값이 가장 높은 '해야할 일'을 찾습니다.
  const todos = await Todo.find().sort("-order").exec();

  // 찾은 '해야할 일'을 클라이언트에게 전달합니다.
  return res.status(200).json({ todos });
});

/** 변경 API */
router.patch("/todos/:todoId", async (req, res) => {
  // 변경할 '해야할 일'의 ID 값을 가져옵니다.
  const { todoId } = req.params;
  // '해야할 일'을 몇번째 순서로 설정할 지 order 값을 가져옵니다.
  const { order, done, value } = req.body;

  // 변경하려는 '해야할 일'을 가져옵니다. 만약, 해당 ID값을 가진 '해야할 일'이 없다면 에러를 발생시킵니다.
  const currentTodo = await Todo.findById(todoId).exec();
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 todo 데이터입니다." });
  }

  if (order) {
    // 변경하려는 order 값을 가지고 있는 '해야할 일'을 찾습니다.
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      // 만약, 이미 해당 order 값을 가진 '해야할 일'이 있다면, 해당 '해야할 일'의 order 값을 변경하고 저장합니다.
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }
    // 변경하려는 '해야할 일'의 order 값을 변경합니니다.
    currentTodo.order = order;
  }

  if (done !== undefined) {
    // 변경하려는 '해야할 일'의 doneAt 값을 변경합니다.
    currentTodo.doneAt = done ? new Date() : null;
  }

  if (value) {
    // 변경하려는 '해야할 일'의 내용을 변경합니다.
    currentTodo.value = value;
  }

  // 변경된 '해야할 일'을 저장합니다.
  await currentTodo.save();

  return res.status(200).json({});
});

/** 할 일 삭제 **/
router.delete("/todos/:todoId", async (req, res) => {
  // 삭제할 '해야할 일'의 ID 값을 가져옵니다.
  const { todoId } = req.params;

  // 삭제하려는 '해야할 일'을 가져옵니다. 만약, 해당 ID값을 가진 '해야할 일'이 없다면 에러를 발생시킵니다.
  const todo = await Todo.findById(todoId).exec();
  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 todo 데이터입니다." });
  }

  // 조회된 '해야할 일'을 삭제합니다.
  await Todo.deleteOne({ _id: todoId }).exec();

  return res.status(200).json({});
});

export default router;
