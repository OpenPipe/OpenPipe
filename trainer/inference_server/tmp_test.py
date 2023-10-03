from modal import Stub, Volume, method, web_endpoint

models_volume = Volume.from_name("model-store")


# @stub.cls(allow_concurrent_inputs=40, keep_warm=1, volumes={"/models": models_volume})
# class Model:
#     def __init__(self, model_id) -> None:
#         self.engine = load_engine(f"/models/{model_id}")

#     @method()
#     async def generate(self, request):
#         return self.engine.generate(request)


# @stub.function()
# @web_endpoint(method="POST")
# def generate_completion(model_id, request):
#     model = Model(model_id)
#     return model.generate(request)
