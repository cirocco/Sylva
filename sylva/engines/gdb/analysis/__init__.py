# -*- coding: utf-8 -*-
import datetime

from sylva.celery import app

from analytics.models import Analytic

PROC_INIT = 0
LOAD_FILE = 1
RUN_ALGOS = 2
PROC_FINA = 3


class BaseAnalysis(object):
    """
    Base class for Analytics with the common API to implement.
    """

    def get_algorithms(self):
        """
        Returns the list of available algorithms with labels
        """
        raise NotImplementedError("Method has to be implemented")

    def get_dump(graph_id):
        """
        Dump the content of the graph into an edgelist file
        """
        raise NotImplementedError("Method has to be implemented")

    # def run_<algorithm>(analytic):
    #     """
    #     Run <algorithm> over the object analytic
    #     """
    #     raise NotImplementedError("Method has to be implemented")

    # def estimate_<algorithm>(analytic):
    #     """
    #     Estiamte in ms the time of execution of <algorithm>
    #     """
    #     raise NotImplementedError("Method has to be implemented")

    @app.task(bind=True, name="analytics.run_algorithm")
    def run(self, analytic_id, analysis):
        try:
            analytic = Analytic.objects.get(id=analytic_id)
            algorithm = analytic.algorithm
            analytic.task_id = self.request.id
            analytic.task_start = datetime.datetime.now()
            analytic.task_status = "Starting"
            algorithm_func = getattr(analysis, "run_{0}".format(algorithm))
            results = algorithm_func(analytic)
            analysis.save(results, analytic)
            analytic.task_status = "Ready"
            analytic.task_end = datetime.datetime.now()
        except Exception as e:
            analytic.task_status = "Failed"
            if not e.args:
                analytic.task_error = \
                    'Totally unknown error: ' + str(e)
            elif e.args[0] == PROC_INIT:
                analytic.task_error = \
                    'Error starting the task: ' + e.args[1]
            elif e.args[0] == LOAD_FILE:
                analytic.task_error = \
                    'File could not be loaded: ' + e.args[1]
            elif e.args[0] == RUN_ALGOS:
                analytic.task_error = \
                    'Algorithm could not be processed: ' + e.args[1]
            elif e.args[0] == PROC_FINA:
                analytic.task_error = \
                    'File system could not be created: ' + e.args[1]
            else:
                analytic.task_error = \
                    'Unknown error: ' + str(e.args[0])
        finally:
            analytic.save()
        if not analytic.task_error:
            return analytic.task_status
        else:
            return analytic.task_error

    def estimate(self, analysis, graph, algorithm):
        estimate_func = getattr(analysis, "estimate_{0}".format(algorithm))
        estimation = estimate_func(graph)
        return estimation
